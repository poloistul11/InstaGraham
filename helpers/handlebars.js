function hbsHelpers(hbs) {
    return hbs.create({
        helpers: { // This was missing
            inc: function (value, options) {
                console.log('reading it');
                return parseInt(value) + 1;
            },

            if_eq: function (a, b, opts) {
                if (a == b) // Or === depending on your needs
                    return opts.fn(this);
                else
                    return opts.inverse(this);
            }
        }
    });
}

module.exports = hbsHelpers;