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

llm = ChatGroq(
    groq_api_key=GROQ_API_KEY, 
    model_name=GROQ_MODEL,
    temperature=0.1
)

# --- 1. Define Tools ---

@tool
def get_stock_price(ticker: str):
    """
    Fetches latest price and 5-day history. Handles .NS automatically.
    Use for price and growth percentage questions.
    """
    try:
        ticker_clean = ticker.upper().replace(".NS", "")
        yf_ticker = f"{ticker_clean}.NS"
        stock = yf.Ticker(yf_ticker)
        
        hist = stock.history(period="5d", interval="60m")
        if hist.empty:
            return f"No data found for {ticker_clean}."

        current_price = hist['Close'].iloc[-1]
        start_price = hist['Close'].iloc[0]
        growth = ((current_price - start_price) / start_price) * 100
        
        history_str = [f"{idx.strftime('%m-%d %H:%M')}: ₹{round(row['Close'], 2)}" 
                       for idx, row in hist.tail(5).iterrows()]
        
        return (f"**{ticker_clean}** Price: **₹{round(current_price, 2)}**\n"
                f"5-Day Growth: **{round(growth, 2)}%**\n"
                f"Recent Points:\n" + "\n".join(history_str))
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def get_market_news(query: str):
    """
    Searches news and extracts content. Use for 'Why' or 'Reason' questions.
    """
    from tavily import TavilyClient
    tavily = TavilyClient(api_key=TAVILY_API_KEY)
    try:
        # include_raw_content=True fixes the "News Error" loop
        response = tavily.search(query=query, search_depth="advanced", max_results=2, include_raw_content=True)
        results = response.get('results', [])
        if not results: return "No news found."

        news_text = ""
        for n in results:
            body = n.get('raw_content', n.get('content', ''))[:800]
            news_text += f"### {n['title']}\n{body}\nSource: {n['url']}\n\n"
        
        return news_text
    except Exception as e:
        return f"News error: {str(e)}"

@tool
async def check_my_portfolio(config: RunnableConfig):
    """Fetches user portfolio holdings."""
    db = config["configurable"].get("db_session")
    user_id = config["configurable"].get("user_id")
    if not db or not user_id: return "Error: No session."

    items = await portfolio_crud.get_portfolio_by_user(db, user_id)
    if not items: return "Your portfolio is empty."

    report = "User Portfolio:\n"
    for item in items:
        ticker = scraper_engine.ID_MAP_REVERSE.get(item.stock_id, str(item.stock_id))
        live = scraper_engine.CACHE.get(item.stock_id, {}).get("price", item.buy_price)
        report += f"- **{ticker}**: {item.quantity} qty @ ₹{live}\n"
    return report

# --- 2. Build the Graph (FIXED NAME ERROR) ---

# CRITICAL: Define this list BEFORE using it in nodes
tools = [get_stock_price, get_market_news, check_my_portfolio]
tool_node = ToolNode(tools)

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

def agent(state: AgentState):
    # Bind tools to the model inside the node
    model = llm.bind_tools(tools)
    return {"messages": [model.invoke(state["messages"])]}

def should_continue(state: AgentState):
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END

workflow = StateGraph(AgentState)
workflow.add_node("agent", agent)
workflow.add_node("tools", tool_node)

workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", should_continue, ["tools", END])
workflow.add_edge("tools", "agent")

app = workflow.compile(checkpointer=MemorySaver())

# --- 3. Entry Point ---

async def get_bot_response(user_query: str, db, user_id: int) -> str:
    system_message = SystemMessage(content="""
    You are a AI stock platform assistant. 
    1. For current price, use 'get_stock_price'. 
    2. For 'why','will stock price increase or decrease','growth' use 'get_market_news'. 
    3. Always give a final answer after tool use.
    """)

    config = {
        "configurable": {
            "thread_id": str(user_id),
            "db_session": db,
            "user_id": user_id
        },
        "recursion_limit": 10
    }

    input_messages = [system_message, HumanMessage(content=user_query)]
    final_response = ""
    
    try:
        async for event in app.astream_events({"messages": input_messages}, config=config, version="v1"):
            if event["event"] == "on_chat_model_stream":
                content = event["data"]["chunk"].content
                if content: final_response += content

        if not final_response:
            snapshot = app.get_state(config)
            final_response = snapshot.values['messages'][-1].content
            
    except Exception as e:
        return f"Error: {str(e)}"

    return final_response
