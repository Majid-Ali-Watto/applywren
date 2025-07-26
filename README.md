# Bulk Applier 📨

Bulk Applier is a powerful web application that streamlines the job application process by allowing users to manage and send multiple job applications efficiently. Built with Next.js and modern web technologies, it offers a seamless experience for job seekers.


## ✨ Features

- **Document Management**
  - Upload and store multiple resumes
  - Create and manage cover letter templates
  - Preview documents before sending

- **Email Integration**
  - Send personalized emails to multiple recipients
  - Attach different resumes to different applications
  - Support for CC and BCC recipients
  - Professional email formatting

- **Application Tracking**
  - Track application status and history
  - Organize applications by company and position
  - Monitor response rates

- **User Experience**
  - Intuitive and responsive design
  - Real-time document preview
  - Secure authentication system

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB database
- Gmail account for email sending (or other email service)

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB Connection
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_secure_jwt_secret

# Email Configuration
GMAIL_PASS=your_gmail_app_password
FROM=your_sender_email@gmail.com
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/bulk-applier.git
cd bulk-applier
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠 Tech Stack

- **Frontend**
  - Next.js 15.4
  - React 18
  - TailwindCSS
  - Quill Editor for rich text
  - HTML2PDF for document conversion

- **Backend**
  - Next.js API Routes
  - MongoDB with Mongoose
  - JWT Authentication
  - Nodemailer for email sending

- **Security**
  - bcryptjs for password hashing
  - JWT for secure sessions
  - Protected API routes
  - Input validation and sanitization
