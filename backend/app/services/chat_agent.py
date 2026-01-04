import os
import json
import yfinance as yf
from typing import Annotated, Literal, TypedDict
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import END, StateGraph, START
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode
from langchain_core.runnables import RunnableConfig

# Import your existing CRUD and Services
from app.services import scraper_engine
from app.crud import portfolio as portfolio_crud

# --- Configuration ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
GROQ_MODEL = "llama-3.1-8b-instant"

# Initialize LLM
llm = ChatGroq(
    groq_api_key=GROQ_API_KEY, 
    model_name=GROQ_MODEL,
    temperature=0.1
)

# --- 1. Define Tools ---

@tool
def get_stock_price(ticker: str):
    """
    Fetches the latest intraday stock price and 5-day history for a given ticker symbol.
    Input should be a valid stock symbol (e.g., 'RELIANCE', 'TATASTEEL', 'AAPL').
    If the user asks for an Indian stock, this tool automatically handles the .NS extension.
    """
    try:
        # Smart suffix handling for NSE stocks
        ticker_clean = ticker.upper().replace(".NS", "")
        yf_ticker = f"{ticker_clean}.NS"
        
        stock = yf.Ticker(yf_ticker)
        # Fast check: Get current price
        info = stock.info
        if 'currentPrice' not in info:
            # Fallback for some indices or if info fails
            history = stock.history(period="1d")
            if history.empty:
                return f"Could not find data for ticker: {ticker}. Please check the symbol."
            current_price = history['Close'].iloc[-1]
        else:
            current_price = info['currentPrice']

        # Get 5 days context for the LLM
        hist = stock.history(period="5d", interval="60m")
        history_str = []
        for index, row in hist.iterrows():
            date_str = index.strftime("%Y-%m-%d %H:%M") 
            history_str.append(f"{date_str}: ₹{round(row['Close'], 2)}")
        
        return f"Current Price of {ticker}: ₹{current_price}\n\nRecent History:\n" + "\n".join(history_str[-10:]) # Last 10 points
    except Exception as e:
        return f"Error fetching data for {ticker}: {str(e)}"

@tool
def get_market_news(query: str):
    """
    Searches for real-time market news, sector updates, or reasons behind market movements.
    Use this when the user asks 'Why', 'News', 'Reason', or about general market trends.
    """
    from tavily import TavilyClient
    tavily = TavilyClient(api_key=TAVILY_API_KEY)
    try:
        response = tavily.search(query=query, search_depth="basic", max_results=3)
        results = response.get('results', [])
        formatted_news = "\n".join([f"- {n['title']} ({n['url']})" for n in results])
        return formatted_news if formatted_news else "No relevant news found."
    except Exception as e:
        return f"News search failed: {str(e)}"

@tool
async def check_my_portfolio(config: RunnableConfig):
    """
    Fetches the current user's portfolio holdings from the database.
    Use this ONLY when the user asks about 'my holdings', 'my stocks', or 'my portfolio'.
    """
    # We retrieve the DB session and User ID from the config passed during invocation
    db = config["configurable"].get("db_session")
    user_id = config["configurable"].get("user_id")
    
    if not db or not user_id:
        return "System Error: Database session or User ID missing in context."

    items = await portfolio_crud.get_portfolio_by_user(db, user_id)
    
    if not items:
        return "Your portfolio is empty."

    report = "User Portfolio:\n"
    total_val = 0
    for item in items:
        # Use the reverse map to get the name, or fallback to ID
        ticker = scraper_engine.ID_MAP_REVERSE.get(item.stock_id, str(item.stock_id))
        
        # Try to get live price from scraper cache, else buy_price
        live = scraper_engine.CACHE.get(item.stock_id, {}).get("price", item.buy_price)
        
        val = item.quantity * live
        total_val += val
        report += f"- {ticker}: {item.quantity} qty @ ₹{live} (Value: ₹{round(val, 2)})\n"
    
    report += f"\nTotal Portfolio Value: ₹{round(total_val, 2)}"
    return report

# --- 2. Build the Graph ---

tools = [get_stock_price, get_market_news, check_my_portfolio]
tool_node = ToolNode(tools)

# Bind tools to the LLM
model_with_tools = llm.bind_tools(tools)

# Define State
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

# Define Agent Node
def agent(state: AgentState):
    return {"messages": [model_with_tools.invoke(state["messages"])]}

# Define Logic: Should we continue to tools or end?
def should_continue(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    return END

# Construct Graph
workflow = StateGraph(AgentState)
workflow.add_node("agent", agent)
workflow.add_node("tools", tool_node)

workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", should_continue, ["tools", END])
workflow.add_edge("tools", "agent")

# Initialize Memory
memory = MemorySaver()

# Compile
app = workflow.compile(checkpointer=memory)

# --- 3. Main Entry Point ---

async def get_bot_response(user_query: str, db, user_id: int) -> str:
    """
    Entry point for the Chat API.
    Manages the conversation thread based on user_id.
    """
    # System Prompt to guide behavior and formatting
    system_message = SystemMessage(content="""
    You are a smart financial assistant for a Stock Platform.
    
    GUIDELINES:
    1. **Format**: Use Markdown. Use **Bold** for prices and symbols. Use Lists for news.
    2. **Portfolio**: If asked about holdings, call the 'check_my_portfolio' tool.
    3. **Data**: If the stock is NOT in the user's portfolio or hardcoded list, use 'get_stock_price' to fetch from Yahoo Finance.
    4. **News**: Use 'get_market_news' for questions about 'why', 'trends', or 'news'.
    5. **Tone**: concise, professional, and helpful.
    """)

    # Config includes the session ID (thread) and the DB objects for the tools
    config = {
        "configurable": {
            "thread_id": str(user_id), # Use User ID as thread ID for simple user memory
            "db_session": db,
            "user_id": user_id
        }
    }

    # Stream the graph execution
    final_response = ""
    
    # We pass the input messages. LangGraph handles the rest.
    input_messages = [system_message, HumanMessage(content=user_query)]
    
    # Run the graph
    async for event in app.astream_events({"messages": input_messages}, config=config, version="v1"):
        # We only care about the final LLM response for the API return
        if event["event"] == "on_chat_model_stream":
            content = event["data"]["chunk"].content
            if content:
                final_response += content

    # Fallback if streaming capture is tricky in simple setup, just get the last message
    if not final_response:
        snapshot = app.get_state(config)
        if snapshot.values and snapshot.values['messages']:
            final_response = snapshot.values['messages'][-1].content

    return final_response