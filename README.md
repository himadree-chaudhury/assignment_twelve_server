# Matrimony Platform - Server Side

**Website Name**: Pathway  
**Admin Email**: admin@gmail.com  
**Admin Password**: 123456Aa  
**Live Site URL**: [Visit Pathway](https://pathway-himadree.web.app/)  
**Client Repository**: [Visit Client Side Repo](https://github.com/himadree-chaudhury/assignment_twelve_client)

## Overview
The server-side of Pathway is built with Node.js, Express, and MongoDB, providing a robust API for the Matrimony platform. It handles user authentication, biodata management, payment processing, and admin functionalities. This repository contains the backend code for the platform.

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

## Technologies Used
- Node.js
- Express
- MongoDB (Mongoose)
- JSON Web Token (JWT)
- Stripe
- Dotenv
- CORS