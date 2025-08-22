# ClinEdit

A modern React-based document editor application for creating and managing Clinical Study Reports (CSR) and other structured documents.

##  Features

- **Rich Text Editor**: Advanced document editing with TipTap editor
- **Document Management**: Create, view, edit, and delete documents
- **Template System**: Upload and configure CSR templates
- **Authentication**: Firebase-based user authentication with Google Sign-in
- **Responsive Design**: Material-UI based modern interface
- **3D Visualization**: Three.js integration for enhanced user experience
- **PDF Export**: Export documents to PDF format
- **Real-time Updates**: Live document editing and saving

##  Tech Stack

- **Frontend Framework**: React 19.1.1
- **UI Library**: Material-UI (MUI) v7.3.1
- **Rich Text Editor**: TipTap v3.2.0
- **Authentication**: Firebase v12.1.0
- **3D Graphics**: Three.js v0.179.1 + React Three Fiber
- **HTTP Client**: Axios v1.11.0
- **Routing**: React Router DOM v7.8.1
- **State Management**: React Context API
- **Styling**: CSS + Emotion
- **Animations**: Framer Motion v12.23.12
- **PDF Generation**: html2pdf.js v0.10.3

##  Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── 3D/             # 3D visualization components
│   ├── ProtectedRoute.jsx  # Authentication guard
├── context/             # React Context providers
│   └── AuthContext.jsx  # Authentication state management
├── pages/               # Application pages
│   ├── Dashboard/       # Document management dashboard
│   ├── EditorPage/      # Rich text editor interface
│   ├── LandingPage/     # Welcome/landing page
│   ├── Layout/          # Main application layout
│   ├── MainRouterPage/  # Routing configuration
│   ├── Sidebar/         # Navigation sidebar
│   ├── TemplateConfiguration/  # Template management
│   └── services/        # API service functions
├── assets/              # Static assets (images, etc.)
├── firebase.js          # Firebase configuration
├── App.js               # Main application component
└── index.js             # Application entry point
```

##  Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager
- Firebase project setup

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory with the following variables:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
   REACT_APP_BASE_URL=http://localhost:8000
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

   The application will open at `http://localhost:3000`

##  Available Scripts

- `npm start` - Start development server
- `npm build` - Build production bundle
- `npm test` - Run test suite
- `npm eject` - Eject from Create React App (irreversible)

##  Architecture

### Component Structure

- **App.js**: Main application wrapper with routing
- **RouterPage.jsx**: Central routing configuration with protected routes
- **Layout.jsx**: Main application layout with sidebar navigation
- **DashboardPage.jsx**: Document management interface
- **EditorPage.jsx**: Rich text editor with TipTap integration
- **TemplateConfiguration.jsx**: Template upload and management

### State Management

- **AuthContext**: Firebase authentication state
- **Local State**: Component-level state management
- **API Services**: Centralized API communication layer

### Authentication Flow

1. User signs in with Google via Firebase
2. JWT token stored and used for API requests
3. Protected routes require valid authentication
4. Token automatically refreshed by Firebase

##  API Integration

The frontend communicates with the backend through RESTful APIs:

- **Document Management**: CRUD operations for documents
- **Template Upload**: PDF template processing
- **Authentication**: JWT token verification

All API calls include Firebase authentication tokens for security.

##  UI/UX Features

- **Material Design**: Consistent Material-UI components
- **Responsive Layout**: Mobile and desktop optimized
- **Interactive Elements**: Hover effects, animations, and transitions
- **Accessibility**: ARIA labels and keyboard navigation support



##  Security Features

- Firebase Authentication integration
- JWT token-based API authorization
- Protected routes for authenticated users
- Secure environment variable handling

##  Deployment

### Build for Production

```bash
npm run build
```

### Environment Variables for Production

Ensure all required environment variables are set in your production environment:

- Firebase configuration
- Backend API URL
- CORS origins

### Deployment Platforms

- **Vercel**: Recommended for React applications


##  Testing

```bash
npm test
```

The application includes:
- Jest testing framework
- React Testing Library
- Component testing utilities

##  Dependencies

### Core Dependencies
- React 19.1.1 - UI framework
- Material-UI 7.3.1 - Component library
- TipTap 3.2.0 - Rich text editor
- Firebase 12.1.0 - Authentication and backend

### Development Dependencies
- React Scripts 5.0.1 - Build tools
- Testing libraries for component testing
- Source map loader for debugging




## Version History

- **v0.1.0**: Initial release with basic document editing
- Current version includes rich text editing, template management, and 3D visualization
