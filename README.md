# AI Interview Practice Platform

A full-stack voice-based interview practice application that simulates real job interviews using AI-powered question generation, real-time analysis, and detailed performance feedback.

## 🏗️ Architecture Overview

### Frontend Stack
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: React Router v6
- **State Management**: React Hooks (useState, useEffect)
- **HTTP Client**: Supabase JS Client

### Backend Stack
- **Database**: PostgreSQL (via Supabase)
- **Serverless Functions**: Supabase Edge Functions (Deno runtime)
- **Authentication**: Row Level Security (RLS) policies
- **AI Provider**: AI Gateway API (google/gemini-2.5-flash model)

### Core Technologies
- **Voice Input**: Web Speech API (browser-based)
- **Voice Output**: Web Speech Synthesis API
- **PDF Generation**: jsPDF library
- **Real-time Updates**: Supabase Realtime (PostgreSQL)

---

## 🤖 AI Models Used

### Primary Model: Google Gemini 2.5 Flash
- **Provider**: AI Gateway API
- **Model ID**: `google/gemini-2.5-flash`
- **Use Cases**:
  - Structured interview question generation
  - Real-time answer analysis and feedback
  - Final performance evaluation
  - Preparation resource recommendations
- **Characteristics**:
  - Balanced speed and quality
  - Good multimodal reasoning
  - Cost-efficient for high-volume operations
  - Temperature: 0.7 for consistent but creative responses

---

## 📊 Database Schema

### Tables

#### `interview_sessions`
Stores interview session metadata.
```sql
- id: UUID (PK)
- role: TEXT (job title)
- company: TEXT (company name)
- resume_text: TEXT (optional, user's resume)
- status: TEXT (in_progress, completed)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `conversation_messages`
Stores all interview conversation turns.
```sql
- id: UUID (PK)
- session_id: UUID (FK -> interview_sessions)
- role: TEXT (interviewer, candidate)
- content: TEXT (message content)
- created_at: TIMESTAMP
```

#### `interview_analysis`
Stores final performance analysis.
```sql
- id: UUID (PK)
- session_id: UUID (FK -> interview_sessions)
- clarity_score: INTEGER (0-100)
- confidence_score: INTEGER (0-100)
- technical_accuracy_score: INTEGER (0-100)
- fluency_description: TEXT
- problem_solving_description: TEXT
- relevance_analysis: TEXT
- created_at: TIMESTAMP
```

---

## 🔧 Edge Functions

### 1. `generate-questions`
**Purpose**: Generate 9 structured interview questions based on role and company.

**Input**:
```typescript
{
  role: string;
  company: string;
  resume?: string; // Optional
}
```

**Output**:
```typescript
{
  questions: string[]; // Array of exactly 9 questions
}
```

**Structure**:
- Questions 0-2: Behavioral (starts with "Tell me about yourself")
- Questions 3-5: Technical (role-specific, includes project questions if resume provided)
- Questions 6-8: HR/Culture fit

**Error Handling**:
- Validates required fields (role, company)
- Falls back to parsing JSON from markdown code blocks
- Returns 500 with error message on API failures

---

### 2. `analyze-answer`
**Purpose**: Analyze candidate's answer and provide feedback with next question.

**Input**:
```typescript
{
  question: string;
  answer: string;
  role: string;
  company: string;
  conversationHistory: string;
  remainingQuestions: string[];
  resume?: string;
}
```

**Output**:
```typescript
{
  feedback: string; // Contains analysis + next question or wrap-up
}
```

**AI Prompt Strategy**:
- Analyzes answer briefly (1-2 sentences)
- Provides constructive feedback
- Asks EXACTLY ONE question from remaining questions
- Uses resume context for project-related questions
- Wraps up when no questions remain

**Critical Rules**:
- Must ask only one question at a time (prevents double-questioning bug)
- Conversational and natural tone
- Feedback-first approach

---

### 3. `final-analysis`
**Purpose**: Generate comprehensive performance analysis after interview completion.

**Input**:
```typescript
{
  conversationHistory: string;
  role: string;
  company: string;
}
```

**Output**:
```typescript
{
  clarity_score: number; // 0-100
  confidence_score: number; // 0-100
  technical_accuracy_score: number; // 0-100
  fluency_description: string;
  problem_solving_description: string;
  relevance_analysis: string;
}
```

**Analysis Criteria**:
- **Clarity**: How well ideas were expressed
- **Confidence**: Assertiveness and self-assurance
- **Technical Accuracy**: Correctness of technical responses
- **Fluency**: Speech patterns and articulation
- **Problem Solving**: Approach to challenges
- **Relevance**: How well questions were addressed

---

### 4. `generate-resources`
**Purpose**: Generate preparation resources (company info, role prep links).

**Input**:
```typescript
{
  role: string;
  company: string;
}
```

**Output**:
```typescript
{
  resources: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}
```

**Resource Types**:
- Company career pages
- Role-specific preparation guides
- Technical documentation
- Interview tips and strategies

**Validation**:
- Returns only real, accessible URLs
- 3-5 high-quality resources

---

### 5. `speech-to-text`
**Purpose**: Convert audio recordings to text transcriptions.

**Input**:
```typescript
{
  audio: string; // Base64-encoded audio blob
}
```

**Output**:
```typescript
{
  text: string; // Transcribed text
}
```

**Implementation Details**:
- Uses OpenAI Whisper model
- Processes base64 in chunks (32KB) to prevent memory issues
- Accepts WebM audio format
- Handles large files efficiently

---

### 6. `text-to-speech`
**Purpose**: Convert text to speech audio.

**Input**:
```typescript
{
  text: string;
}
```

**Output**:
- Audio stream (WebM format)

**Note**: Currently using browser Web Speech API for TTS. This edge function is prepared for future enhancement with higher-quality TTS services.

---

## 🎯 Application Flow

### 1. **Session Creation** (`/`)
- User enters job role and company
- Optionally uploads resume (TXT format only)
- Creates `interview_sessions` record
- Navigates to `/interview/:sessionId`

### 2. **Question Generation**
- Calls `generate-questions` edge function
- Stores first question in `conversation_messages`
- Speaks question using Web Speech Synthesis

### 3. **Interview Loop** (`/interview/:sessionId`)
- **Listen**: VoiceButton captures audio using Web Speech API
- **Transcribe**: Converts speech to text (browser-based)
- **Save**: Stores candidate answer in database
- **Analyze**: Calls `analyze-answer` for feedback
- **Respond**: Saves and speaks AI feedback + next question
- **Repeat**: Until all 9 questions answered

### 4. **Interview Completion**
- Updates session status to "completed"
- Navigates to `/results/:sessionId`

### 5. **Results Analysis** (`/results/:sessionId`)
- Fetches conversation history
- Calls `final-analysis` for comprehensive scoring
- Calls `generate-resources` for preparation links
- Saves analysis to `interview_analysis` table
- Displays scores, feedback, and resources
- Offers PDF export

---

## 🛡️ Edge Cases & Error Handling

### Resume Upload
- **Issue**: PDFs contain null bytes that can't be stored in text fields
- **Solution**: Accept only TXT files
- **UX**: Clear error message, file input reset on invalid format
- **Enhancement**: Future PDF parsing with text extraction library

### Voice Recognition
- **Browser Compatibility**: Checks for Web Speech API support
- **Permissions**: Handles microphone permission denial
- **No Speech Detected**: Shows toast notification, allows retry
- **Background Noise**: Uses continuous recognition with manual stop

### AI Response Handling
- **Double Questions**: Fixed with explicit "ask only ONE question" prompt
- **JSON Parsing**: Fallback to extract arrays from markdown code blocks
- **API Failures**: Graceful error handling with user-friendly messages
- **Rate Limiting**: Could implement exponential backoff (future)

### Session Management
- **Missing Session**: Redirects to home page
- **Incomplete Interviews**: Can resume from last question
- **Duplicate Analysis**: Checks existing analysis before generating

### Database Operations
- **Connection Errors**: Shows error toast, doesn't crash app
- **Transaction Failures**: Rolls back on error
- **Concurrent Access**: UUID primary keys prevent conflicts

### PDF Export
- **Long Text**: Text wrapping and pagination
- **Special Characters**: Proper encoding
- **Large Conversations**: Memory-efficient generation

---

## 🔐 Security Measures

### Row Level Security (RLS)
All tables have public access policies for prototype. Production should implement:
- User authentication with Supabase Auth
- RLS policies filtering by `auth.uid()`
- Secure API key storage in environment variables

### Input Validation
- **Client-side**: Form validation, file type checking
- **Server-side**: Edge functions validate all inputs
- **SQL Injection**: Using Supabase client (parameterized queries)
- **XSS Protection**: React escapes content by default

### API Key Management
- Stored in Supabase secrets
- Never exposed to client
- Accessed only in edge functions via `Deno.env.get()`

---

## 🚀 Deployment

### Frontend
- Built with `npm run build`
- Outputs to `dist/` directory
- Static assets served from CDN
- Environment variables via `.env` (auto-generated)

### Edge Functions
- Automatically deployed with code changes
- No manual deployment required
- Deno runtime environment
- CORS enabled for all functions

### Database
- Managed PostgreSQL instance
- Automatic backups
- Connection pooling enabled
- Real-time subscriptions available

---

## 📦 Dependencies

### Frontend
```json
{
  "@supabase/supabase-js": "^2.84.0",
  "react": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "jspdf": "^3.0.4",
  "lucide-react": "^0.462.0",
  "tailwindcss": "^3.x",
  "@radix-ui/*": "shadcn/ui components"
}
```

### Backend (Edge Functions)
```typescript
// Deno imports
"https://deno.land/x/xhr@0.1.0/mod.ts"
"https://deno.land/std@0.168.0/http/server.ts"
```

---

## 🧪 Testing Considerations

### Unit Tests (Future)
- Edge function logic
- PDF generation
- Score calculations

### Integration Tests (Future)
- Full interview flow
- Database operations
- AI API interactions

### Manual Testing
- Cross-browser voice compatibility
- Mobile responsiveness
- Error scenarios
- Performance with long interviews

---

## 📈 Performance Optimizations

### Frontend
- React.memo for heavy components
- Lazy loading for routes (future)
- Debounced API calls
- Optimized re-renders with proper state management

### Backend
- Edge function cold start optimization
- Database indexes on foreign keys
- Chunked audio processing in speech-to-text
- Connection pooling

### AI Calls
- Streaming responses (future enhancement)
- Token limit optimization
- Context window management

---

## 🔄 Future Enhancements

1. **Authentication System**: User accounts with saved interview history
2. **PDF Resume Parsing**: Extract text from PDF files
3. **Custom Voice Selection**: Choose interviewer voice
4. **Interview Recording**: Save full audio for playback
5. **Multi-language Support**: Internationalization
6. **Mobile App**: React Native version
7. **Video Support**: Practice with video interviews
8. **Team Features**: Share results with coaches/mentors
9. **Analytics Dashboard**: Track improvement over time
10. **Custom Question Banks**: Industry-specific questions

---

## 🐛 Known Issues

1. **Voice Quality**: Browser TTS varies by OS/browser
   - Workaround: Users can read questions silently
   - Future: Upgrade to premium TTS service

2. **Mobile Voice Input**: Limited browser support
   - Chrome Android: Works
   - Safari iOS: Limited functionality

3. **PDF File Size**: Large conversations create large PDFs
   - Current limit: Reasonable for typical interviews
   - Future: Compress or split PDFs

---

## 💻 Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Git

### Setup
```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd interview-practice-platform

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables
The `.env` file is auto-generated by Supabase integration and contains:
```
VITE_SUPABASE_URL=<your-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

---

## 📄 License

This project is private and proprietary.

---

## 👥 Contributing

This is a personal project. Contributions are not currently accepted.

---

## 📞 Support

For issues or questions, please create an issue in the repository.
