const {User, generalUser} = require('../../../models');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;



// middleware which must be moved to middle ware section
// middle ware to authenticate user using google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    const userData = {
        googleId: profile.id,
        email: profile.emails[0].value,
        username: profile.displayName,
    };


    let user = await User.findOne({ email: userData.email });

    if (!user) {
        user = await User.create(userData);
    }
    return done(null, {user});
}));
