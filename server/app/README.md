# ClinEdit Backend

A FastAPI-based backend service for the Document Editor application, providing document management, template processing, and AI-powered PDF analysis capabilities.

##  Features

- **Document Management**: CRUD operations for Clinical Study Reports (CSR)
- **Template Processing**: AI-powered PDF template structure extraction
- **Authentication**: Firebase JWT token verification
- **AI Integration**: Google Gemini AI for document analysis
- **Database**: Firestore integration for data persistence
- **File Upload**: PDF template upload and processing
- **RESTful API**: Clean, documented API endpoints
- **CORS Support**: Cross-origin resource sharing enabled

##  Tech Stack

- **Framework**: FastAPI (Python)
- **Database**: Google Firestore
- **Authentication**: Firebase Admin SDK
- **AI Services**: Google Gemini AI
- **File Processing**: PDF handling and analysis
- **Validation**: Pydantic models
- **CORS**: Cross-origin middleware
- **Environment**: Python virtual environment

##  Project Structure

```
app/
├── api/                    # API route definitions
│   └── routes/           # Endpoint implementations
│       ├── documents.py  # Document CRUD operations
│       └── templates.py  # Template upload and processing
├── core/                  # Core configuration and setup
│   ├── config.py         # Environment configuration
│   └── firestore.py      # Database connection
├── dependencies/          # Dependency injection
│   └── verify_token.py   # Firebase token verification
├── models/                # Data models
│   └── template.py       # Pydantic models for templates
├── services/              # Business logic services
│   ├── csr_documentservice.py  # Document operations
│   ├── gemini_service.py       # AI integration
│   └── template_service.py     # Template management
├── main.py                # FastAPI application entry point
├── serviceAccountKey.json # Firebase service account credentials
└── venv/                  # Python virtual environment
```

## Getting Started

### Prerequisites

- Python 3.8 or higher
- Firebase project setup
- Google Gemini AI API access

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd server/app
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install fastapi uvicorn firebase-admin google-genai pydantic pydantic-settings python-multipart
   ```

4. **Environment Setup**
   Create a `.env` file in the app directory:
   ```env
   FIREBASE_CREDENTIAL_PATH=./serviceAccountKey.json
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_REDIRECT_URI=https://your-domain.com/auth/callback
   AUTH_URI=https://accounts.google.com/o/oauth2/auth
   TOKEN_URI=https://oauth2.googleapis.com/token
   ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
   FRONTEND_URL=http://localhost:3000
   BACKEND_BASE_URL=http://localhost:8000
   ```

5. **Firebase Setup**
   - Download your Firebase service account key
   - Place it as `serviceAccountKey.json` in the app directory
   - Ensure the service account has Firestore read/write permissions

6. **Start the server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`

##  API Endpoints

### Authentication
All endpoints require Firebase JWT token in the Authorization header:
```
Authorization: Bearer <firebase_jwt_token>
```

### Documents API

#### Create Document
```http
POST /api/create-document
Content-Type: application/json

{
  "metadata": {
    "studyId": "STUDY-001",
    "documentType": "CSR",
    "version": "1.0",
    "author": "John Doe"
  }
}
```

#### Get All Documents
```http
GET /api/documents
Authorization: Bearer <token>
```

#### Get Document by ID
```http
GET /api/documents/{document_id}
Authorization: Bearer <token>
```

#### Update Document
```http
PUT /api/documents/{document_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "sections": [...],
  "content": {...}
}
```

#### Delete Document
```http
DELETE /api/documents/{document_id}
Authorization: Bearer <token>
```

### Templates API

#### Upload CSR Template
```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <pdf_file>
```

##  Architecture

### Service Layer

- **DocumentService**: Handles CRUD operations for documents
- **TemplateService**: Manages template storage and retrieval
- **GeminiService**: Integrates with Google AI for PDF analysis

### Data Models

- **CSRTemplate**: Pydantic model for template structure
- **Section**: Template section with subsections
- **Subsection**: Individual template subsection

### Authentication Flow

1. Frontend sends Firebase JWT token
2. Backend verifies token using Firebase Admin SDK
3. User ID extracted from verified token
4. Request processed with user context

##  Database Schema

### Firestore Collections

```
users/
├── {user_id}/
│   ├── csr_templates/
│   │   └── {template_id}/
│   │       ├── meta_keys: []
│   │       ├── sections: []
│   │       ├── created_at: timestamp
│   │       └── updated_at: timestamp
│   └── csr_documents/
│       └── {document_id}/
│           ├── title: string
│           ├── sections: []
│           ├── created_at: timestamp
│           ├── updated_at: timestamp
│           └── uploaded_by: string
```

## AI Integration

### Google Gemini AI

The backend uses Google Gemini AI to:
- Extract structure from PDF templates
- Identify document sections and subsections
- Parse metadata from title pages
- Generate structured template data

### AI Processing Flow

1. PDF file uploaded via API
2. File bytes sent to Gemini AI
3. AI analyzes PDF structure
4. Structured data returned and stored
5. Template available for document creation

##  Security Features

- **Firebase Authentication**: JWT token verification
- **CORS Protection**: Configurable cross-origin policies
- **Input Validation**: Pydantic model validation
- **File Type Validation**: PDF-only uploads
- **File Size Limits**: 20MB maximum file size
- **User Isolation**: Data scoped to authenticated users

##  Error Handling

- **HTTP Status Codes**: Proper REST API status responses
- **Error Messages**: Descriptive error details
- **Validation Errors**: Pydantic validation feedback
- **Authentication Errors**: Clear unauthorized access messages

##  Deployment

### Production Setup

1. **Environment Variables**
   - Set all required environment variables
   - Use secure secret management
   - Configure production URLs

2. **Firebase Configuration**
   - Production Firebase project
   - Service account with appropriate permissions
   - Firestore security rules

3. **Server Configuration**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

### Deployment Platforms
- **Docker**: Containerized deployment


## Testing

### API Testing

```bash
# Test with curl
curl -X GET "http://localhost:8000/api/documents" \
  -H "Authorization: Bearer <your_token>"

# Test with FastAPI automatic docs
# Visit http://localhost:8000/docs
```

### Load Testing

```bash
# Install locust
pip install locust

# Run load tests
locust -f locustfile.py
```

##  Dependencies

### Core Dependencies
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **Firebase Admin**: Authentication and database
- **Google Genai**: AI integration
- **Pydantic**: Data validation

### Development Dependencies
- **Python-multipart**: File upload handling
- **Pydantic-settings**: Environment configuration

##  Monitoring and Logging

- **FastAPI Logging**: Built-in request/response logging
- **Error Tracking**: Exception handling and logging
- **Performance Monitoring**: Request timing and metrics
- **Health Checks**: API health endpoint



##  Version History

- **v0.1.0**: Initial release with basic document management
- Current version includes AI-powered template processing and Firebase integration

##  API Documentation

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## Configuration Options

### CORS Settings
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### File Upload Limits
- Maximum file size: 20MB
- Supported formats: PDF only
- Content type validation enabled
