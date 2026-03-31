# MindCare - Online Mental Health Consultation System

A modern, frontend-only web application for online mental health consultation built with React, plain CSS, and Axios.

## Features

- **User Authentication**: Secure login and signup system
- **Journal & Mood Tracking**: Write journal entries with AI sentiment analysis
- **Mood Insights**: GitHub-style mood history visualization
- **AI Chatbot**: 24/7 mental health support chatbot
- **Community Support**: Share stories and find support from others (fully accessible without login)
- **Appointment Booking**: Schedule sessions with expert therapists
- **Therapist Listing**: Browse and filter qualified mental health professionals
- **Mental Health Resources**: Curated articles and wellness tips
- **Emergency Support**: Crisis resources and immediate help contacts
- **User Profile**: Manage personal information and preferences

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone or Extract the Project**
   ```bash
   cd mindcare-app
   ```

2. **Install Dependencies**
   ```bash
   # Copy the React package.json
   cp package-react.json package.json
   
   # Install packages
   npm install
   ```

3. **Configure Environment Variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Update .env with your backend URL
   # REACT_APP_BACKEND_URL=http://your-backend-api.com
   ```

4. **Start the Development Server**
   ```bash
   npm start
   ```
   The app will open at `http://localhost:3000`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.js
│   ├── Button.js
│   ├── Card.js
│   ├── Modal.js
│   ├── Toast.js
│   └── *.css
├── pages/              # Page components (12 pages)
│   ├── LandingPage.js
│   ├── LoginSignupPage.js
│   ├── Dashboard.js
│   ├── JournalMoodTracker.js
│   ├── MoodInsights.js
│   ├── ChatbotPage.js
│   ├── CommunitySupport.js
│   ├── AppointmentBooking.js
│   ├── TherapistListing.js
│   ├── ResourcesPage.js
│   ├── EmergencySupport.js
│   ├── ProfileSettings.js
│   └── *.css
├── services/           # API services
│   └── api.js
├── styles/             # Global styles
│   └── index.css
├── App.js             # Main app component with routing
└── index.js           # React entry point
```

## Design Features

- **Dark Theme**: Deep blues/purples with glassmorphism effects
- **Smooth Animations**: Subtle hover effects and transitions
- **Responsive Design**: Mobile-first approach, works on all screen sizes
- **Consistent Color System**: 
  - Primary: Indigo (#6366f1)
  - Secondary: Purple (#8b5cf6)
  - Accent: Pink (#ec4899)
  - Neutrals: Dark grays and whites

## API Endpoints

The app uses placeholder endpoints that connect to `[BACKEND_URL]`:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `POST /auth/logout` - User logout

### Journal & Mood
- `POST /journal/submit` - Submit journal entry
- `GET /journal/list` - Get user's journals
- `DELETE /journal/:id` - Delete journal entry
- `POST /mood/analyze` - Analyze mood/sentiment
- `GET /mood/history` - Get mood history

### Appointments
- `GET /appointments/available` - Get available time slots
- `POST /appointments/book` - Book appointment
- `GET /appointments/list` - Get user's appointments
- `DELETE /appointments/:id` - Cancel appointment

### Therapists
- `GET /therapists` - List therapists with filters
- `GET /therapists/:id` - Get therapist details

### Community
- `GET /community/posts` - Get community posts
- `POST /community/posts` - Create new post
- `POST /community/posts/:id/react` - Add reaction
- `DELETE /community/posts/:id` - Delete post

### User
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `GET /user/stats` - Get user statistics

## Technology Stack

- **Frontend**: React 18.2 with Hooks
- **Styling**: Plain CSS (no frameworks)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Context & Hooks
- **Build Tool**: Create React App

## Pages Overview

1. **Landing Page** - Hero section with features and CTA
2. **Login/Signup** - Authentication with form validation
3. **Dashboard** - Overview of recent entries and quick actions
4. **Journal & Mood Tracker** - Write entries with mood selection
5. **Mood Insights** - GitHub-style mood history grid with analytics
6. **AI Chatbot** - Chat interface with suggested prompts
7. **Community Support** - Anonymous posting (accessible without login)
8. **Appointment Booking** - Select therapist, date, and time
9. **Therapist Listing** - Browse therapists with filters
10. **Resources** - Articles and wellness tips by category
11. **Emergency Support** - Crisis resources and coping strategies
12. **Profile Settings** - Manage account and preferences

## Features in Detail

- **Protected Routes**: Only logged-in users can access specific pages
- **Anonymous Posting**: Community posts don't require authentication
- **Blurred Previews**: Locked features show preview with login prompt
- **Form Validation**: Client-side validation on all forms
- **Modal System**: Confirmation modals for important actions
- **Toast Notifications**: Real-time feedback messages

## Customization

### Colors
Edit CSS variables in `src/styles/index.css`:
```css
--color-primary: #6366f1;
--color-secondary: #8b5cf6;
--color-accent: #ec4899;
```

### Fonts
The app uses system fonts for optimal performance:
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'...
```

### API Endpoint
Update the backend URL in `.env`:
```
REACT_APP_BACKEND_URL=your-api-url-here
```

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
vercel deploy
```

### Deploy to Other Platforms
The built files in `build/` can be deployed to any static hosting service (Netlify, GitHub Pages, AWS S3, etc.).

## Code Standards

- **Component Structure**: Functional components with Hooks
- **CSS Organization**: BEM naming convention
- **API Calls**: Centralized in `services/api.js`
- **State Management**: Component-level state with Context for global state
- **Responsive**: Mobile-first design with media queries

## Troubleshooting

### Port Already in Use
```bash
# On macOS/Linux
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### CORS Issues
Ensure your backend has proper CORS headers enabled:
```
Access-Control-Allow-Origin: http://localhost:3000
```

### API Connection Error
Check that `REACT_APP_BACKEND_URL` in `.env` matches your backend URL.

## Documentation

For more information on how to customize or extend this app:
- React: https://react.dev
- React Router: https://reactrouter.com
- Axios: https://axios-http.com
- CSS Grid: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout

## License

This project is provided as-is for educational and commercial use.

## Support

For issues or questions:
1. Check the API endpoint configuration
2. Verify backend is running
3. Check browser console for errors
4. Ensure all environment variables are set

---

Built for mental health and wellness.
