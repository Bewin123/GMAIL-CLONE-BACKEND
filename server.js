require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET;

// Middleware
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Error connecting to MongoDB:", error));

// Define User schema and model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Define Email schema and model
const emailSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  body: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipients: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Email = mongoose.model("Email", emailSchema);

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Route for user registration
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.status(201).send({ message: "User registered successfully" });
  } catch (error) {
    console.log("Error registering user:", error);
    res.status(500).send({ message: "Registration failed" });
  }
});

// Route for user login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send({ message: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ message: "Invalid email or password" });
    }
    const token = jwt.sign({ email }, jwtSecret, {
      expiresIn: "1h",
    });
    res.send({ token, email, message: "Login successful" });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).send({ message: "Login failed" });
  }
});

// Middleware for JWT authentication
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Route to send emails using nodemailer
app.post("/api/send-email", upload.array("attachments"), async (req, res) => {
  const { to, subject, body } = req.body;
  const attachments = req.files;

  try {
    // Extract the email from the payload
    const from = req.body.email;
    console.log("from", from);
    const recipientUsers = await User.find({ email: { $in: to } }, "email");
    const recipientEmails = recipientUsers.map((user) => user.email);
    console.log(process.env);

    const mailOptions = {
      from,
      to: recipientEmails.join(","),
      subject,
      text: body,
      attachments: attachments.map((file) => ({
        filename: file.originalname,
        path: file.path,
      })),
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return res.status(500).send({ message: "Failed to send email" });
      }
      res.status(200).send({ message: "Email sent successfully", info });
    });
  } catch (error) {
    console.log("Error sending email:", error);
    res.status(500).send({ message: "Failed to send email" });
  }
});

// Route to fetch users and their passwords in tabular format
app.get("/api/data", async (req, res) => {
  try {
    const users = await User.find({}, "email password");

    let htmlResponse = `
      <html>
        <head>
          <title>User Details</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f0f0f0;
              margin: 0;
              padding: 20px;
            }
            .container {
              width: 80%;
              margin: auto;
              background: white;
              padding: 20px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            h1 {
              text-align: center;
              color: #333;
              margin-bottom: 20px;
            }
            .table-container {
              margin-top: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            tr:nth-child(even) {
              background-color: #f2f2f2;
            }
            tr:hover {
              background-color: #ddd;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>User Details</h1>
            <div class="table-container">
              <table>
                <tr>
                  <th>Email</th>
                  <th>Password</th>
                </tr>`;

    users.forEach((user) => {
      htmlResponse += `
        <tr>
          <td>${user.email}</td>
          <td>${user.password}</td>
        </tr>`;
    });

    htmlResponse += `
              </table>
            </div>
          </div>
        </body>
      </html>`;

    res.send(htmlResponse);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send({ message: "Failed to fetch users" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
