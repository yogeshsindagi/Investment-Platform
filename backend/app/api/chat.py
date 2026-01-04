from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.dependencies import get_current_user_id
from app.services.chat_agent import get_bot_response

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str

@router.post("/chat")
async def chat_endpoint(
    req: ChatRequest, 
    db: AsyncSession = Depends(get_db),             
    user_id: int = Depends(get_current_user_id)     
):
    try:
        # We pass db and user_id. 
        # The agent uses user_id as 'thread_id' to remember previous messages from this user.
        response_text = await get_bot_response(req.prompt, db, user_id)
        
        # If response is empty (rare graph edge case), return a default
        if not response_text:
            response_text = "I processed your request but didn't generate a text response. Please check your inputs."
            
        return {"response": response_text}
    except Exception as e:
        print(f"Chat API Error: {e}")
        # Return the actual error for debugging during development
        raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")