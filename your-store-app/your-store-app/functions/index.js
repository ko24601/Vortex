const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret, defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const fetch = require("node-fetch");

admin.initializeApp();

const gmailPass = defineSecret("GMAIL_PASS");
const gmailUser = defineString(
    "GMAIL_USER",
    {default: "kvix3112@gmail.com"},
);

// PayPal secret stored securely in Firebase Secret Manager
const paypalSecret = defineSecret("PAYPAL_SECRET");
// PayPal Client ID (not secret, but kept here for server-side calls)
const PAYPAL_CLIENT_ID = "BAAajxUiXpVegAq_zM9DhOUrGq2TE28Xizd_lnsxu26OD7x1NXkiqbLmI_6DRUVmwpLUE6o7Ab9pdOZEKg";
const PAYPAL_BASE = "https://api-m.paypal.com"; // Live mode

/**
 * Verifies a PayPal order capture with PayPal's API using the secret key.
 * Called from the frontend after PayPal's onApprove callback fires.
 * Returns { verified: true, orderId } on success.
 */
exports.verifyPayPalPayment = onRequest(
    {
      secrets: [paypalSecret],
      cors: true,
    },
    async (req, res) => {
      if (req.method !== "POST") {
        return res.status(405).json({error: "Method not allowed"});
      }

      const {orderID} = req.body;
      if (!orderID) {
        return res.status(400).json({error: "Missing orderID"});
      }

      try {
        // Step 1: Get an access token from PayPal using Client ID + Secret
        const authResponse = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + Buffer.from(
                `${PAYPAL_CLIENT_ID}:${paypalSecret.value()}`
            ).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "grant_type=client_credentials",
        });

        const authData = await authResponse.json();
        if (!authData.access_token) {
          console.error("PayPal auth failed:", authData);
          return res.status(500).json({error: "Failed to authenticate with PayPal"});
        }

        // Step 2: Fetch the order details to verify it was actually COMPLETED
        const orderResponse = await fetch(
            `${PAYPAL_BASE}/v2/checkout/orders/${orderID}`,
            {
              headers: {
                "Authorization": `Bearer ${authData.access_token}`,
                "Content-Type": "application/json",
              },
            }
        );

        const orderData = await orderResponse.json();

        if (orderData.status === "COMPLETED") {
          const amount = orderData.purchase_units?.[0]?.amount?.value;
          console.log(`PayPal order ${orderID} verified. Amount: ${amount}`);
          return res.status(200).json({verified: true, orderId: orderID, amount});
        } else {
          console.warn(`PayPal order ${orderID} not completed. Status: ${orderData.status}`);
          return res.status(400).json({verified: false, status: orderData.status});
        }
      } catch (error) {
        console.error("Error verifying PayPal payment:", error);
        return res.status(500).json({error: "Internal server error"});
      }
    }
);

exports.forwardVipInquiry = onDocumentCreated(
    {
      document: "vip_inquiries/{inquiryId}",
      secrets: [gmailPass],
    },
    async (event) => {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No data associated with the event");
        return;
      }

      const data = snapshot.data();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser.value(),
          pass: gmailPass.value(),
        },
      });

      const mailOptions = {
        from: "\"Boutique Vault\" <kvix3112@gmail.com>",
        to: "kvix3112@gmail.com",
        subject: "New VIP Concierge Inquiry",
        text: `You have received a new secure ` +
              `inquiry from your luxury ` +
              `boutique app:\n\nMessage: ` +
              `${data.message}\nSubmitted At: ` +
              `${data.timestamp}`,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(
            "VIP Inquiry successfully forwarded to kvix3112@gmail.com.",
        );
      } catch (error) {
        console.error("Error sending email:", error);
      }
    },
);

// Automatically triggers a notification when a new product is created in Firestore
exports.onProductCreated = onDocumentCreated(
    {
      document: "products/{productId}",
    },
    async (event) => {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No snapshot data available for product creation");
        return;
      }

      const product = snapshot.data();

      try {
        await admin.firestore().collection("notifications").add({
          title: "New Luxury Drop",
          body: `${product.name || "An exclusive item"} is now available in ${product.category || "the collection"}.`,
          type: "new_drop",
          read: false,
          timestamp: new Date().toISOString(),
        });
        console.log(`Notification successfully created for product: ${product.name}`);
      } catch (error) {
        console.error("Error creating notification for new product:", error);
      }
    },
);


exports.forwardVipInquiry = onDocumentCreated(
    {
      document: "vip_inquiries/{inquiryId}",
      secrets: [gmailPass],
    },
    async (event) => {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No data associated with the event");
        return;
      }

      const data = snapshot.data();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser.value(),
          pass: gmailPass.value(),
        },
      });

      const mailOptions = {
        from: "\"Boutique Vault\" <kvix3112@gmail.com>",
        to: "kvix3112@gmail.com",
        subject: "New VIP Concierge Inquiry",
        text: `You have received a new secure ` +
              `inquiry from your luxury ` +
              `boutique app:\n\nMessage: ` +
              `${data.message}\nSubmitted At: ` +
              `${data.timestamp}`,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(
            "VIP Inquiry successfully forwarded to kvix3112@gmail.com.",
        );
      } catch (error) {
        console.error("Error sending email:", error);
      }
    },
);

// Automatically triggers a notification when a new product is created in Firestore
exports.onProductCreated = onDocumentCreated(
    {
      document: "products/{productId}",
    },
    async (event) => {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("No snapshot data available for product creation");
        return;
      }

      const product = snapshot.data();

      try {
        await admin.firestore().collection("notifications").add({
          title: "New Luxury Drop",
          body: `${product.name || "An exclusive item"} is now available in ${product.category || "the collection"}.`,
          type: "new_drop",
          read: false,
          timestamp: new Date().toISOString(),
        });
        console.log(`Notification successfully created for product: ${product.name}`);
      } catch (error) {
        console.error("Error creating notification for new product:", error);
      }
    },
);