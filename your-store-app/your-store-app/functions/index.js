const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {defineSecret, defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const gmailPass = defineSecret("GMAIL_PASS");
const gmailUser = defineString(
    "GMAIL_USER",
    {default: "kvix3112@gmail.com"},
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