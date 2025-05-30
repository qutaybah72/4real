require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files

// Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const client = new twilio(accountSid, authToken);

// Generate unique credentials
function generateCredentials(phone) {
    return {
        userId: `user_${Math.random().toString(36).substr(2, 8)}`,
        apiKey: `key_${Math.random().toString(36).substr(2, 16)}`,
        phoneNumber: `+${phone}`,
        createdAt: new Date().toISOString(),
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        permissions: ['read', 'write', 'update']
    };
}

// Route to handle WhatsApp message sending
app.post('/send-creds', async (req, res) => {
    const phone = req.body.phoneNumber;
    
    // Validate phone number
    if (!phone || !/^\d{8,15}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid phone number format. Please use digits only (8-15 characters)'
        });
    }
    
    try {
        // Generate credentials
        const credentials = generateCredentials(phone);
        const credentialsJson = JSON.stringify(credentials, null, 2);
        
        // Send WhatsApp message
        await client.messages.create({
            body: `Your secure credentials:\n\n\`\`\`json\n${credentialsJson}\n\`\`\`\n🔒 Keep this information secure!`,
            from: twilioWhatsAppNumber,
            to: `whatsapp:+${phone}`
        });
        
        res.json({
            success: true,
            message: 'Credentials sent to your WhatsApp!'
        });
    } catch (error) {
        console.error('Twilio Error:', error);
        let errorMessage = 'Failed to send credentials. Please try again later.';
        
        if (error.code === 21211) {
            errorMessage = 'Invalid phone number format. Please check and try again.';
        } else if (error.code === 21608) {
            errorMessage = 'Your number is not verified. Please join the Twilio sandbox first.';
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access the app at http://localhost:${PORT}`);
    console.log(`Twilio Account SID: ${accountSid ? '*****' + accountSid.slice(-4) : 'Not set'}`);
});