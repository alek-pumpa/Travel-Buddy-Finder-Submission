// Initialize MongoDB with basic setup
db = db.getSiblingDB('travel_buddy');

// Create collections with indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "location": "2dsphere" });
db.users.createIndex({ "isActive": 1 });

db.matches.createIndex({ "users": 1 });
db.matches.createIndex({ "matchedOn": -1 });

db.swipes.createIndex({ "swiper_id": 1, "swiped_id": 1 }, { unique: true });

db.marketplacelistings.createIndex({ "location": "2dsphere" });
db.marketplacelistings.createIndex({ "category": 1 });
db.marketplacelistings.createIndex({ "createdBy": 1 });

db.conversations.createIndex({ "participants": 1 });
db.messages.createIndex({ "conversation": 1, "timestamp": -1 });

print("Database initialized successfully!");