import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, User, Bot, Play } from 'lucide-react';

const InterviewChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [selectedJob, setSelectedJob] = useState('');
  const messagesEndRef = useRef(null);

  const jobTypes = [
    'AI/Machine Learning',
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'Data Science',
    'DevOps Engineer',
    'Python Developer',
    'JavaScript Developer'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startInterview = async (job) => {
    setSelectedJob(job);
    setInterviewStarted(true);
    
    const welcomeMsg = {
      role: 'assistant',
      content: `Welcome to your ${job} interview! I'll be asking you a series of questions including multiple choice, short answers, and coding problems. Let's begin!`,
      timestamp: new Date().toISOString()
    };
    
    setMessages([welcomeMsg]);
    
    // Get first question
    await getNextQuestion(job, []);
  };

  const getNextQuestion = async (job, history) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_type: job,
          chat_history: history
        })
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.question,
        type: data.type,
        options: data.options,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Error connecting to backend. Make sure FastAPI server is running on port 8000.',
        timestamp: new Date().toISOString()
      }]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_type: selectedJob,
          answer: input,
          chat_history: messages
        })
      });

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.feedback,
        timestamp: new Date().toISOString()
      }]);

      // Get next question after short delay
      setTimeout(() => {
        getNextQuestion(selectedJob, [...messages, userMsg]);
      }, 1500);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Error evaluating answer. Check backend connection.',
        timestamp: new Date().toISOString()
      }]);
    }
    setLoading(false);
  };

  const handleMcqSelect = async (option) => {
    if (loading) return;
    
    const userMsg = {
      role: 'user',
      content: `Selected: ${option}`,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_type: selectedJob,
          answer: option,
          chat_history: messages
        })
      });

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.feedback,
        timestamp: new Date().toISOString()
      }]);

      setTimeout(() => {
        getNextQuestion(selectedJob, [...messages, userMsg]);
      }, 1500);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Error evaluating answer.',
        timestamp: new Date().toISOString()
      }]);
    }
    setLoading(false);
  };

  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-full mb-4">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              AI Interview Assistant
            </h1>
            <p className="text-gray-600">
              Select your target role to begin the technical interview
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobTypes.map((job) => (
              <button
                key={job}
                onClick={() => startInterview(job)}
                className="p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <Play className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  {job}
                </h3>
                <p className="text-sm text-gray-600">
                  MCQ, Coding & Theory Questions
                </p>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Make sure your FastAPI backend is running on localhost:8000
            </p>
          </div>
        </div>
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];
  const showMcqOptions = lastMessage?.role === 'assistant' && lastMessage?.options;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{selectedJob} Interview</h2>
              <p className="text-xs text-gray-600">AI-Powered Assessment</p>
            </div>
          </div>
          <button
            onClick={() => {
              setInterviewStarted(false);
              setMessages([]);
              setSelectedJob('');
            }}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          >
            End Interview
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-green-500'
                    : 'bg-indigo-600'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div
                className={`max-w-2xl p-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-800 shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.options && idx === messages.length - 1 && (
                  <div className="mt-4 space-y-2">
                    {msg.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleMcqSelect(opt)}
                        disabled={loading}
                        className="w-full text-left p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="font-semibold text-indigo-600">
                          {String.fromCharCode(65 + i)}.
                        </span>{' '}
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Only show if not MCQ */}
      {!showMcqOptions && (
        <div className="bg-white border-t p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer here..."
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InterviewChatbot;