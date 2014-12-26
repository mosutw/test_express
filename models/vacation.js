var mongoose = require('mongoose');

var vacationSchema = mongoose.Schema({
  name: String,
  slug: String,
  category: String,
  sku:  String,
  description: String,
  priceInCents: Number,
  tags: [String],
  inSeason: Boolean,
  available: Boolean,
  requiresWaiver: Boolean,
  maximumguests: Number,
  notes: String,
  packagesSold: Number,  
});

vacationSchema.method.getDisplayPrice = function(){
  return '$' + (this.priceInCents / 100).toFixed(2);
};

var Vacation = mongoose.model('Vacation', vacationSchema);
module.exports = Vacation;
