from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import requests
import json
import random

app = FastAPI(title="AI Interview Chatbot API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ollama API endpoint (default local)
OLLAMA_API = "http://localhost:11434/api/generate"
MODEL_NAME = "deepseek-r1:1.5b"  # Change to your installed model

# Question banks by job type and difficulty
QUESTION_BANK = {
    "AI/Machine Learning": {
        "mcq": [
            {
                "question": "What is the primary purpose of the activation function in a neural network?",
                "options": [
                    "To introduce non-linearity into the model",
                    "To initialize weights",
                    "To reduce overfitting",
                    "To normalize input data"
                ],
                "answer": "To introduce non-linearity into the model",
                "difficulty": "medium"
            },
            {
                "question": "Which algorithm is commonly used for dimensionality reduction?",
                "options": ["PCA", "K-Means", "Random Forest", "Logistic Regression"],
                "answer": "PCA",
                "difficulty": "medium"
            },
            {
                "question": "What does 'overfitting' mean in machine learning?",
                "options": [
                    "Model performs well on training but poorly on test data",
                    "Model performs poorly on both training and test data",
                    "Model is too simple",
                    "Training takes too long"
                ],
                "answer": "Model performs well on training but poorly on test data",
                "difficulty": "easy"
            }
        ],
        "short": [
            "Explain the difference between supervised and unsupervised learning with examples.",
            "What is gradient descent and why is it important in training neural networks?",
            "Describe the bias-variance tradeoff in machine learning."
        ],
        "coding": [
            "Write a Python function to implement linear regression from scratch using gradient descent.",
            "Implement a function to calculate accuracy, precision, and recall given true labels and predictions.",
            "Write code to normalize a numpy array using min-max scaling."
        ]
    },
    "Full Stack Developer": {
        "mcq": [
            {
                "question": "Which HTTP method is idempotent?",
                "options": ["POST", "GET", "PATCH", "All of the above"],
                "answer": "GET",
                "difficulty": "medium"
            },
            {
                "question": "What does REST stand for?",
                "options": [
                    "Representational State Transfer",
                    "Remote Execution State Transfer",
                    "Rapid State Transition",
                    "Resource State Transfer"
                ],
                "answer": "Representational State Transfer",
                "difficulty": "easy"
            }
        ],
        "short": [
            "Explain the difference between SQL and NoSQL databases with use cases.",
            "What is CORS and why is it important in web development?",
            "Describe the Model-View-Controller (MVC) architecture pattern."
        ],
        "coding": [
            "Write a SQL query to find the second highest salary from an Employee table.",
            "Implement a simple REST API endpoint in any framework to create and retrieve users.",
            "Write JavaScript code to debounce a search input function."
        ]
    },
    "Python Developer": {
        "mcq": [
            {
                "question": "What is the output of: print(type([]) == list)?",
                "options": ["True", "False", "Error", "None"],
                "answer": "True",
                "difficulty": "easy"
            },
            {
                "question": "Which Python data structure is mutable and ordered?",
                "options": ["Tuple", "List", "Set", "Dictionary"],
                "answer": "List",
                "difficulty": "easy"
            }
        ],
        "short": [
            "Explain the difference between list, tuple, and set in Python.",
            "What are decorators in Python and how do you use them?",
            "Describe Python's GIL (Global Interpreter Lock) and its implications."
        ],
        "coding": [
            "Write a Python function to find all prime numbers up to N using the Sieve of Eratosthenes.",
            "Implement a function to check if two strings are anagrams.",
            "Write code to reverse a linked list in Python."
        ]
    },
    "Data Science": {
        "mcq": [
            {
                "question": "What is the purpose of cross-validation?",
                "options": [
                    "To assess model performance on unseen data",
                    "To speed up training",
                    "To reduce features",
                    "To normalize data"
                ],
                "answer": "To assess model performance on unseen data",
                "difficulty": "medium"
            }
        ],
        "short": [
            "Explain the difference between correlation and causation.",
            "What is A/B testing and how is it used in data science?",
            "Describe the steps in a typical data science project workflow."
        ],
        "coding": [
            "Write Python code using pandas to handle missing values in a dataset.",
            "Implement a function to calculate the Pearson correlation coefficient.",
            "Write code to create a simple linear regression model using scikit-learn."
        ]
    }
}

# Add more job types with similar structure
for job in ["Frontend Developer", "Backend Developer", "DevOps Engineer", "JavaScript Developer"]:
    if job not in QUESTION_BANK:
        QUESTION_BANK[job] = {
            "mcq": QUESTION_BANK["Full Stack Developer"]["mcq"],
            "short": QUESTION_BANK["Full Stack Developer"]["short"][:2],
            "coding": QUESTION_BANK["Full Stack Developer"]["coding"][:2]
        }


class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None


class QuestionRequest(BaseModel):
    job_type: str
    chat_history: List[Dict]


class EvaluateRequest(BaseModel):
    job_type: str
    answer: str
    chat_history: List[Dict]


def call_ollama(prompt: str, model: str = MODEL_NAME) -> str:
    """Call Ollama API to generate response"""
    try:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9
            }
        }
        
        response = requests.post(OLLAMA_API, json=payload, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        return result.get("response", "").strip()
    
    except requests.exceptions.ConnectionError:
        return "ERROR: Cannot connect to Ollama. Make sure Ollama is running (ollama serve)"
    except requests.exceptions.Timeout:
        return "ERROR: Ollama request timed out"
    except Exception as e:
        return f"ERROR: {str(e)}"


def get_random_question(job_type: str, question_count: int):
    """Select a random question from the bank"""
    if job_type not in QUESTION_BANK:
        job_type = "Full Stack Developer"
    
    bank = QUESTION_BANK[job_type]
    
    # Rotate through question types
    if question_count % 3 == 0:
        q_type = "mcq"
        question_data = random.choice(bank["mcq"])
        return {
            "type": "mcq",
            "question": question_data["question"],
            "options": question_data["options"],
            "answer": question_data["answer"]
        }
    elif question_count % 3 == 1:
        q_type = "short"
        question = random.choice(bank["short"])
        return {
            "type": "short",
            "question": question,
            "options": None
        }
    else:
        q_type = "coding"
        question = random.choice(bank["coding"])
        return {
            "type": "coding",
            "question": question,
            "options": None
        }


@app.get("/")
def read_root():
    return {
        "message": "AI Interview Chatbot API",
        "status": "active",
        "endpoints": ["/api/question", "/api/evaluate"]
    }


@app.post("/api/question")
def generate_question(request: QuestionRequest):
    """Generate next interview question"""
    try:
        question_count = len([m for m in request.chat_history if m.get("role") == "assistant"])
        
        # Get question from bank
        q_data = get_random_question(request.job_type, question_count)
        
        return {
            "question": q_data["question"],
            "type": q_data["type"],
            "options": q_data["options"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/evaluate")
def evaluate_answer(request: EvaluateRequest):
    """Evaluate user's answer using Ollama"""
    try:
        # Get last question from history
        last_question = None
        for msg in reversed(request.chat_history):
            if msg.get("role") == "assistant" and "?" in msg.get("content", ""):
                last_question = msg.get("content")
                break
        
        if not last_question:
            return {"feedback": "Question not found in history."}
        
        # Create evaluation prompt for Ollama
        prompt = f"""You are an expert technical interviewer for {request.job_type} positions.

Question asked: {last_question}

Candidate's answer: {request.answer}

Provide a brief evaluation (2-3 sentences):
1. Is the answer correct/appropriate?
2. Give constructive feedback
3. Mention if anything is missing

Keep it professional and encouraging. Format: "✓ [Your evaluation]" or "✗ [Your feedback]"
"""
        
        # Call Ollama for evaluation
        feedback = call_ollama(prompt)
        
        if feedback.startswith("ERROR:"):
            return {"feedback": f"⚠️ {feedback}"}
        
        return {"feedback": feedback}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health_check():
    """Check if Ollama is running"""
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        models = response.json().get("models", [])
        return {
            "ollama_status": "running",
            "available_models": [m["name"] for m in models]
        }
    except:
        return {
            "ollama_status": "not_running",
            "message": "Start Ollama with: ollama serve"
        }


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting AI Interview Chatbot API...")
    print("📝 Make sure Ollama is running: ollama serve")
    print(f"🤖 Using model: {MODEL_NAME}")
    uvicorn.run(app, host="0.0.0.0", port=8000)