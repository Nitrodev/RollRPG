class Mob {
  constructor(data) {
    this.id = data.id;
    this.area = data.area;
    this.level = random(data.level.min, data.level.max);
    this.maxHealth = random(data.health.min, data.health.max);
    this.health = this.maxHealth;
    this.damage = data.damage;
    this.defense = data.defense;
    this.drops = data.drops;
  }

  get name() {
    return lang[currentLanguage][this.id];
  }

  /**
   * Get the mob's loot.
   * This is a list of items that the mob drops.
   * A mob will always drop experience equal to its level.
   */
  get loot() {
    let loot = [];
    for(let i = 0; i < this.drops.length; i++) {
      loot[i] = {
        item: Item.get(this.drops[i].item),
        cost: this.drops[i].cost
      }
    }
    return loot;
  }

}