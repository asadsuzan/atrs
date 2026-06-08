# Activity Tracking & Reporting System (ATRS)

ATRS is a full-stack, comprehensive dashboard and reporting system built to track software products (plugins, blocks, themes) and their associated development activities (features, improvements, bug fixes). Designed with productivity in mind, it provides robust reporting features including automatic PowerPoint generation, deep marketing analysis (Marketing Hub), and timeline tracking.

## 🚀 Features

- **Product Management:** Track and maintain active, inactive, and archived products (plugins, blocks, etc.).
- **Activity Logging:** Record product-specific features, bug fixes, and improvements. Easily tag activities as *Released* or *Unreleased*.
- **Tier Tracking:** Distinguish activities between Free and Pro tiers of your product line.
- **Reporting Engine:** Generate beautiful, automated Monthly Summary PowerPoint (.pptx) reports detailing development activities.
- **Marketing Hub:** Automatically parse and structure feature data, tutorials, documentation, and product descriptions for marketing purposes using the Smart Parser.
- **Command Center:** A centralized dashboard showing quick analytics, recent activity feeds, and completion statistics.

## 🛠 Tech Stack

**Frontend (Client)**
- React (Vite)
- TypeScript
- Tailwind CSS & Shadcn UI (Framer Motion for animations)
- TanStack Query (React Query)
- React Router DOM
- PPTXGenJS (Report Generation)
- Sonner (Toast notifications)

**Backend (Server)**
- Node.js
- Express.js
- MongoDB & Mongoose
- TypeScript
- Zod (Schema Validation)
- Cors & Helmet

## 📋 Prerequisites

Before you begin, ensure you have met the following requirements:
- Node.js (v18.0.0 or higher)
- npm or yarn
- MongoDB (Local instance or MongoDB Atlas cluster)

## ⚙️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd ATRS
   ```

2. **Setup the Backend:**
   ```bash
   cd server
   npm install
   ```

3. **Setup the Frontend:**
   ```bash
   cd ../client
   npm install
   ```

## 🔒 Environment Variables

To run this project, you will need to add the following environment variables.

Create a `.env` file in the `server` directory and add:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/atrs
```

*(Note: Never commit your `.env` file. A `.env.example` file is provided for reference.)*

## 💻 Running the Application

**Start the Development Server (Backend)**
```bash
cd server
npm run dev
```

**Start the Frontend Client**
```bash
cd client
npm run dev
```

The application will now be running on `http://localhost:5173` and connected to the backend API on `http://localhost:5000`.

## 📁 Project Structure

```text
ATRS/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI elements (Shadcn)
│   │   ├── pages/          # Dashboard, Products, Activities, Reports
│   │   ├── services/       # API interaction layer
│   │   ├── contexts/       # React Contexts
│   │   └── hooks/          # Custom Hooks (useLocalStorage, etc.)
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Express Backend
│   ├── src/
│   │   ├── controllers/    # Route Logic
│   │   ├── models/         # Mongoose Schemas (Activity, Product, Marketing)
│   │   ├── routes/         # Express Routes
│   │   ├── middlewares/    # Error Handling & Validation
│   │   └── services/       # Core Business Logic
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
├── .env.example
└── README.md
```

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
