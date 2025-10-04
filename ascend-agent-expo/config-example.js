// ===== CONFIGURATION EXAMPLE =====
// Copy this file to config.js and customize for your event
// Then include it before script.js in your HTML

const customEventData = {
    event: {
        name: "Your Real Estate Conference 2025",
        dates: "June 10-12, 2025",
        location: "Los Angeles Convention Center",
        tagline: "Transform Your Real Estate Business",
        earlyBirdDeadline: "2025-05-01T09:00:00-04:00"
    },
    
    sponsors: [
        {
            name: "Your Sponsor 1",
            logo: "https://via.placeholder.com/200x80/667eea/ffffff?text=Sponsor+1"
        },
        {
            name: "Your Sponsor 2",
            logo: "https://via.placeholder.com/200x80/f093fb/ffffff?text=Sponsor+2"
        }
        // Add up to 16 sponsors total - just logos will be displayed (no links)
    ],
    
    pillars: [
        {
            title: "Your First Pillar",
            description: "Customize this description to match your event's unique value proposition and benefits.",
            icon: "🎯" // Use any emoji or replace with <i> tag for icon fonts
        },
        {
            title: "Your Second Pillar", 
            description: "Highlight the key benefits and learning opportunities your attendees will gain.",
            icon: "💡"
        },
        {
            title: "Your Third Pillar",
            description: "Focus on the networking and growth opportunities that set your event apart.",
            icon: "🚀"
        }
    ],
    
    tickets: [
        {
            tier: "Free Registration",
            price: "FREE",
            perks: [
                "Full conference access",
                "Welcome reception",
                "Networking lunch",
                "Digital materials",
                "Mobile app access",
                "Access to all sessions",
                "Networking opportunities",
                "Certificate of completion",
                "Swag bag"
            ],
            countdown: false,
            available: true,
            featured: true
        }
    ],
    
    venue: {
        name: "Your Conference Venue",
        address: "123 Conference Blvd, Your City, State 12345",
        mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3592.4!2d-118.1234!3d34.0522!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzTCsDAzJzA4LjAiTiAxMTjCsDA3JzI0LjIiVw!5e0!3m2!1sen!2sus!4v1234567890",
        travelTips: "Your airport is 20 minutes away. Uber and taxi services available. Free parking on-site.",
        hotels: [
            {
                name: "Partner Hotel 1",
                rateCode: "YOUREVENT2025",
                link: "https://hotel1.com"
            },
            {
                name: "Partner Hotel 2", 
                rateCode: "YOUREVENT2025",
                link: "https://hotel2.com"
            }
        ]
    },
    
    presentingSponsors: [
        {
            name: "Your Presenting Sponsor 1",
            logo: "https://via.placeholder.com/300x150/667eea/ffffff?text=Presenting+Sponsor+1",
            description: "Detailed description of your first presenting sponsor and how they add value to the conference experience.",
            link: "https://presenting-sponsor1.com",
            mediaUrl: null // Optional: link to video or additional media
        },
        {
            name: "Your Presenting Sponsor 2",
            logo: "https://via.placeholder.com/300x150/764ba2/ffffff?text=Presenting+Sponsor+2",
            description: "Detailed description of your second presenting sponsor and their contribution to the event.",
            link: "https://presenting-sponsor2.com",
            mediaUrl: null
        },
        {
            name: "Your Presenting Sponsor 3",
            logo: "https://via.placeholder.com/300x150/f093fb/ffffff?text=Presenting+Sponsor+3",
            description: "Detailed description of your third presenting sponsor and their industry expertise.",
            link: "https://presenting-sponsor3.com",
            mediaUrl: null
        },
        {
            name: "Your Presenting Sponsor 4",
            logo: "https://via.placeholder.com/300x150/4facfe/ffffff?text=Presenting+Sponsor+4",
            description: "Detailed description of your fourth presenting sponsor and their unique offerings.",
            link: "https://presenting-sponsor4.com",
            mediaUrl: null
        }
        // 4 presenting sponsors total - these get detailed spotlight treatment
    ],
    
    faq: [
        {
            question: "What's included in my ticket?",
            answer: "Your ticket includes access to all sessions, networking events, meals, and digital resources. VIP tickets include additional perks."
        },
        {
            question: "What's your refund policy?",
            answer: "Full refunds available 30+ days before the event. 50% refund 14-30 days before. No refunds within 14 days, but tickets are transferable."
        },
        {
            question: "Is the venue accessible?",
            answer: "Yes, our venue is fully ADA compliant. Please contact us for specific accessibility needs."
        },
        {
            question: "Will sessions be recorded?",
            answer: "Select keynote sessions will be recorded and shared with ticket holders within 48 hours."
        }
        // Add more FAQ items as needed
    ]
};

// ===== HOW TO USE THIS CONFIG =====
/*
1. Copy this file to 'config.js'
2. Customize all the data above for your event
3. Add this line to your HTML before script.js:
   <script src="config.js"></script>
4. Add this line to the end of script.js:
   if (typeof customEventData !== 'undefined') {
       Object.assign(eventData, customEventData);
   }

This allows you to keep your customizations separate from the main template files,
making it easier to update the template in the future while preserving your content.
*/
