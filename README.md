# Doodle

![Doodle Banner](https://i.ibb.co/Bvs7BHD/Banner.png)

**Doodle** is a modern, real-time collaboration platform designed to empower teams with seamless whiteboard interactions, video conferencing, and AI-driven tools. Built with the latest web technologies, Doodle offers a premium experience for brainstorming, planning, and executing ideas together.

## 🚀 Features

- **Real-time Whiteboard**: Collaborative drawing and diagramming with instant updates.
- **Live Video & Audio**: Integrated video conferencing powered by LiveKit.
- **AI Assistance**: Smart suggestions and content generation using Google GenAI.
- **Team Chat**: Real-time messaging for seamless communication.
- **Secure Authentication**: Robust user management with Firebase Authentication.
- **Responsive Design**: Optimized for all devices with a sleek, modern UI.
- **Dark Mode**: Built-in dark mode support for comfortable usage in any environment.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [Radix UI](https://www.radix-ui.com/)
- **Real-time Engine**: [LiveKit](https://livekit.io/)
- **Database & Auth**: [Firebase](https://firebase.google.com/) & [Mongoose](https://mongoosejs.com/)
- **AI Integration**: [Google Generative AI](https://ai.google.dev/)
- **Icons**: [Lucide React](https://lucide.dev/) & [React Icons](https://react-icons.github.io/react-icons/)

## 🏁 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/MayankGurjar3112/doodle.git
   cd doodle
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory and add the following variables:

   ```env
   # LiveKit
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   NEXT_PUBLIC_LIVEKIT_URL=your_livekit_url

   # Firebase
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_PRIVATE_KEY=your_private_key
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url

   # Google GenAI
   API_KEY=your_genai_api_key

   # MongoDB (if applicable)
   MONGO_USERNAME=your_mongo_username
   MONGO_PASSWORD=your_mongo_password
   MONGODB_URI=your_mongodb_connection_string

   # JWT
   JWT_SECRET=your_jwt_secret

   # App URL
   NEXT_PUBLIC_APP_URL=your_app_url
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📜 Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint to check for code quality issues.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the PolyForm Noncommercial License 1.0.0.
