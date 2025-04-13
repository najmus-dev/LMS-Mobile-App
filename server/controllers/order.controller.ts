// import { NextFunction, Request, Response } from "express";
// import { CatchAsyncError } from "../middleware/catchAsyncErrors";
// import ErrorHandler from "../utils/ErrorHandler";
// import { IOrder } from "../models/order.Model";
// import userModel from "../models/user.model";
// import CourseModel, { ICourse } from "../models/course.model";
// import path from "path";
// import ejs from "ejs";
// import sendMail from "../utils/sendMail";
// import NotificationModel from "../models/notification.Model";
// import { getAllOrdersService, newOrder } from "../services/order.service";
// import { redis } from "../utils/redis";
// require("dotenv").config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// // create order
// export const createOrder = CatchAsyncError(
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const { courseId, payment_info } = req.body as IOrder;

//       if (payment_info) {
//         if ("id" in payment_info) {
//           const paymentIntentId = payment_info.id;
//           const paymentIntent = await stripe.paymentIntents.retrieve(
//             paymentIntentId
//           );

//           if (paymentIntent.status !== "succeeded") {
//             return next(new ErrorHandler("Payment not authorized!", 400));
//           }
//         }
//       }

//       const user = await userModel.findById(req.user?._id);

//       const courseExistInUser = user?.courses.some(
//         (course: any) => course.courseId.toString() === courseId
//       );

//       if (courseExistInUser) {
//         return next(
//           new ErrorHandler("You have already purchased this course", 400)
//         );
//       }

//       const course:ICourse | null = await CourseModel.findById(courseId);

//       if (!course) {
//         return next(new ErrorHandler("Course not found", 404));
//       }

//       const data: any = {
//         courseId: course._id,
//         userId: user?._id,
//         payment_info,
//       };

//       const mailData = {
//         order: {
//           _id: course._id.toString().slice(0, 6),
//           name: course.name,
//           price: course.price,
//           date: new Date().toLocaleDateString("en-US", {
//             year: "numeric",
//             month: "long",
//             day: "numeric",
//           }),
//         },
//       };

//       const html = await ejs.renderFile(
//         path.join(__dirname, "../mails/order-confirmation.ejs"),
//         { order: mailData }
//       );

//       try {
//         if (user) {
//           await sendMail({
//             email: user.email,
//             subject: "Order Confirmation",
//             template: "order-confirmation.ejs",
//             data: mailData,
//           });
//         }
//       } catch (error: any) {
//         return next(new ErrorHandler(error.message, 500));
//       }

//       const coureId = course?._id;

//       if (!coureId) {
//         return next(new ErrorHandler("Course not found", 400));
//       }
      
//       // Convert ObjectId to string
//       const courseIdString = coureId.toString();
      
//       // Push the course as an object into the user's courses array
//       user?.courses.push({ courseId: courseIdString });
      
      
      
//       // user?.courses.push(course?._id);

//       const userId = req.user?._id;

//       if (!userId) {
//         return next(new ErrorHandler("User not found", 400));
//       }

//       const userIdString = userId.toString();

//       await redis.set(userIdString, JSON.stringify(user));

//       await user?.save();

//       await NotificationModel.create({
//         user: user?._id,
//         title: "New Order",
//         message: `You have a new order from ${course?.name}`,
//       });

//       course.purchased = course.purchased + 1;

//       await course.save();

//       newOrder(data, res, next);
//     } catch (error: any) {
//       return next(new ErrorHandler(error.message, 500));
//     }
//   }
// );

// // get All orders --- only for admin
// export const getAllOrders = CatchAsyncError(
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       getAllOrdersService(res);
//     } catch (error: any) {
//       return next(new ErrorHandler(error.message, 500));
//     }
//   }
// );

// //  send stripe publishble key
// export const sendStripePublishableKey = CatchAsyncError(
//   async (req: Request, res: Response) => {
//     res.status(200).json({
//       publishablekey: process.env.STRIPE_PUBLISHABLE_KEY,
//     });
//   }
// );

// // new payment
// export const newPayment = CatchAsyncError(
//   async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const myPayment = await stripe.paymentIntents.create({
//         amount: req.body.amount,
//         currency: "USD",
//         metadata: {
//           company: "E-Learning",
//         },
//         automatic_payment_methods: {
//           enabled: true,
//         },
//       });

//       res.status(201).json({
//         success: true,
//         client_secret: myPayment.client_secret,
//       });
//     } catch (error: any) {
//       return next(new ErrorHandler(error.message, 500));
//     }
//   }
// );
import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { IOrder } from "../models/order.Model";
import userModel from "../models/user.model";
import CourseModel, { ICourse } from "../models/course.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notification.Model";
import { getAllOrdersService, newOrder } from "../services/order.service";
import { redis } from "../utils/redis";
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// create order
export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Debugging: Log the incoming request body
      console.log("Incoming order request:", req.body);

      const { courseId, payment_info } = req.body as IOrder;

      // Check if payment_info is available
      if (!payment_info?.id) {
        console.error("Payment info is missing or incomplete");
        return next(new ErrorHandler("Payment info is incomplete", 400));
      }

      // Debugging: Log payment info
      console.log("Payment info received:", payment_info);

      if (payment_info) {
        // Retrieve payment intent from Stripe
        const paymentIntentId = payment_info.id;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        // Debugging: Log payment intent status
        console.log("Stripe payment intent:", paymentIntent);

        if (paymentIntent.status !== "succeeded") {
          console.error("Payment not authorized", paymentIntent.status);
          return next(new ErrorHandler("Payment not authorized!", 400));
        }
      }

      // Find the user who is making the purchase
      const user = await userModel.findById(req.user?._id);
      if (!user) {
        console.error("User not found with ID:", req.user?._id);
        return next(new ErrorHandler("User not found", 400));
      }

      // Check if the course is already in the user's course list
      const courseExistInUser = user?.courses.some(
        (course: any) => course.courseId.toString() === courseId
      );

      if (courseExistInUser) {
        console.error("User already purchased this course:", courseId);
        return next(new ErrorHandler("You have already purchased this course", 400));
      }

      // Find the course being purchased
      const course: ICourse | null = await CourseModel.findById(courseId);
      if (!course) {
        console.error("Course not found:", courseId);
        return next(new ErrorHandler("Course not found", 404));
      }

      // Create order data
      const data: any = {
        courseId: course._id,
        userId: user?._id,
        payment_info,
      };

      // Prepare email data
      const mailData = {
        order: {
          _id: course._id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      // Debugging: Log mail data
      console.log("Email data:", mailData);

      // Render email template and send confirmation email
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/order-confirmation.ejs"),
        { order: mailData }
      );

      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: "Order Confirmation",
            template: "order-confirmation.ejs",
            data: mailData,
          });
          console.log("Order confirmation email sent to:", user.email);
        }
      } catch (error: any) {
        console.error("Error sending email:", error);
        return next(new ErrorHandler(error.message, 500));
      }

      // Add the purchased course to the user's courses array
      const coureId = course?._id;

      if (!coureId) {
        console.error("Invalid course ID:", courseId);
        return next(new ErrorHandler("Course not found", 400));
      }

      // Convert ObjectId to string and push the course into the user's courses array
      const courseIdString = coureId.toString();
      user?.courses.push({ courseId: courseIdString });

      const userId = req.user?._id;
      if (!userId) {
        console.error("Invalid user ID:", req.user?._id);
        return next(new ErrorHandler("User not found", 400));
      }

      const userIdString = userId.toString();

      // Save user to Redis cache
      try {
        await redis.set(userIdString, JSON.stringify(user));
        console.log("User data saved to Redis:", userIdString);
      } catch (error) {
        console.error("Error saving user to Redis:", error);
        return next(new ErrorHandler("Failed to update user in Redis", 500));
      }

      // Save the updated user data to the database
      await user?.save();

      // Create a notification for the user
      await NotificationModel.create({
        user: user?._id,
        title: "New Order",
        message: `You have a new order from ${course?.name}`,
      });

      // Update the course's purchased count
      course.purchased = course.purchased + 1;
      await course.save();

      // Call service to handle the order
      newOrder(data, res, next);
    } catch (error: any) {
      console.error("Error during order creation:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Get All Orders API - Only for admin
export const getAllOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(res);
    } catch (error: any) {
      console.error("Error fetching all orders:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Send Stripe Publishable Key API
export const sendStripePublishableKey = CatchAsyncError(
  async (req: Request, res: Response) => {
    try {
      console.log("Sending Stripe Publishable Key");
      res.status(200).json({
        publishablekey: process.env.STRIPE_PUBLISHABLE_KEY,
      });
    } catch (error: any) {
      console.error("Error sending Stripe publishable key:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// New Payment API
export const newPayment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount } = req.body;
      
      // Debugging: Log payment request
      console.log("Creating new payment with amount:", amount);

      if (!amount || amount <= 0) {
        console.error("Invalid payment amount:", amount);
        return next(new ErrorHandler("Invalid payment amount", 400));
      }

      const myPayment = await stripe.paymentIntents.create({
        amount: amount,
        currency: "USD",
        metadata: {
          company: "E-Learning",
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      console.log("Payment created successfully:", myPayment);

      res.status(201).json({
        success: true,
        client_secret: myPayment.client_secret,
      });
    } catch (error: any) {
      console.error("Error creating payment:", error);
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
