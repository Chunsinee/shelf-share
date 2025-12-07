const determineSmartCategory = (googleCategories) => {
  if (!googleCategories || googleCategories.length === 0) return 'Non-Fiction';
  const allCats = googleCategories.join(' ').toLowerCase();

  if (allCats.includes('fiction') || allCats.includes('fantasy') || allCats.includes('novel') || allCats.includes('thriller') || allCats.includes('manga')) return 'Fiction';
  if (allCats.includes('computer') || allCats.includes('technology') || allCats.includes('software') || allCats.includes('coding')) return 'Technology';
  if (allCats.includes('business') || allCats.includes('economics') || allCats.includes('marketing') || allCats.includes('investing')) return 'Business';
  if ((allCats.includes('science') && !allCats.includes('social')) || allCats.includes('physics') || allCats.includes('biology')) return 'Science';
  if (allCats.includes('history') || allCats.includes('war') || allCats.includes('ancient')) return 'History';
  if (allCats.includes('art') || allCats.includes('design') || allCats.includes('music')) return 'Art & Design';
  if (allCats.includes('biography') || allCats.includes('memoir')) return 'Biography';

  return 'Non-Fiction';
};

module.exports = { determineSmartCategory };
