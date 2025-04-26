# Matrimony Platform - Server Side

**Website Name**: Matrimony Connect  
**Admin Email**: admin@matrimonyconnect.com  
**Admin Password**: Admin123!  
**Live Site URL**: [https://matrimony-connect.vercel.app](https://matrimony-connect.vercel.app)  
**Server Repository**: [https://github.com/username/matrimony-server](https://github.com/username/matrimony-server)

## Overview
The server-side of Matrimony Connect is built with Node.js, Express, and MongoDB, providing a robust API for the Matrimony platform. It handles user authentication, biodata management, payment processing, and admin functionalities. This repository contains the backend code, with over 12 notable GitHub commits.

## Features
- **RESTful API**: Comprehensive endpoints for authentication, biodata, success stories, contact requests, and admin operations.
- **MongoDB Integration**: Efficiently stores and manages data for users, biodatas, success stories, and contact requests.
- **JWT Authentication**: Secures private routes with JSON Web Tokens for user and admin access.
- **Biodata ID Generation**: Dynamically generates unique biodata IDs by incrementing the last ID.
- **Premium Member Logic**: Restricts contact information access to premium members, with admin approval for premium status.
- **Stripe Payments**: Processes $5 USD payments for contact information requests, with secure verification.
- **Server-Side Sorting**: Supports age-based sorting for premium biodata cards and date-based sorting for success stories.
- **Admin Stats**: Provides biodata counts (total, male, female, premium) and revenue tracking for admin dashboard.
- **User Search**: Implements server-side search for admin to find users by username.
- **Contact Request Management**: Handles creation, approval, and deletion of contact requests, with status tracking.
- **Environment Variables**: Secures sensitive data (MongoDB credentials, Stripe keys, JWT secret) using `.env`.
- **CORS Support**: Enables secure communication with the client-side application.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/username/matrimony-server.git
   ```
2. Navigate to the project directory:
   ```bash
   cd matrimony-server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root directory and add environment variables:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ```
5. Start the server:
   ```bash
   npm start
   ```

### Usage
- The server runs at `http://localhost:5000` by default.
- Connect the client-side application to the server by setting `VITE_API_URL=http://localhost:5000/api` in the client’s `.env`.
- Use the admin credentials (`admin@matrimonyconnect.com`, `Admin123!`) to test admin APIs.

## Technologies Used
- Node.js
- Express
- MongoDB (Mongoose)
- JSON Web Token (JWT)
- Stripe
- Dotenv
- CORS

## API Endpoints
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`
- **Biodatas**: `POST /api/biodatas`, `GET /api/biodatas`, `GET /api/biodatas/:id`, `PUT /api/biodatas/:id`
- **Success Stories**: `POST /api/success-stories`, `GET /api/success-stories`
- **Contact Requests**: `POST /api/contact-requests`, `GET /api/contact-requests/:email`, `PUT /api/contact-requests/:id`
- **Favorites**: `POST /api/favorites`, `GET /api/favorites/:email`, `DELETE /api/favorites/:id`
- **Admin**: `GET /api/admin/users/count`, `GET /api/admin/biodatas/stats`, `PUT /api/admin/premium/:id`

## Contributing
Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request with your changes.

## License
This project is licensed under the MIT License.