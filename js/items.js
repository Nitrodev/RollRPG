const RARITY = {
  common: 'white',
  uncommon: 'gray',
  rare: 'blue',
  epic: 'purple',
  legendary: 'orange',
}

class Item {
  constructor(data) {
    this.id = data.id;
    this.type = data.type;
    this.description = data.description;
    this.recipe = data.recipe;
  }

  // Get item's data by the item's id.
  static get(id) {
    let itemData = items.find(item => item.id === id);
    return new Item(itemData);
  }

  get name() {
    return lang[currentLanguage][this.id];
  }
}

class Weapon extends Item {
  constructor(data) {
    super(data);
    this.damage = new Damage(data.damage.min, data.damage.max, data.damage.type);
    this.equipped = false;
  }
}

class Armor extends Item {
  constructor(data) {
    super(data);
    this.defense = new Defense(data.defense.min, data.defense.max);
    this.equipped = false;
  }
}

class Defense {
  constructor(min, max) {
    this.min = min;
    this.max = max;
  }
}

class Damage {
  constructor(min, max, type) {
    this.min = min;
    this.max = max;
    this.type = type || 'physical';
  }
}