class Skill {
  constructor(data) {
    this.id = data.id;
    this.description = data.description;
    this.type = data.type;
    this.conditions = data.conditions.map(condition => new Condition(condition));
    this.effects = data.effects.map(effect => new Effect(effect));

    this.level = 0;
  }

  get name() {
    return lang[currentLanguage][this.id];
  }

  canUnlock(player) {
    return this.conditions.every(condition => condition.check(player));
  }
}

class Condition {
  constructor(data) {
    this.type = data.type;
    this.value = data.value;
  }

  check(player) {
    switch (this.type) {
      case 'weapon':
        // Check if the player has a corresponding weapon equipped
        if(this.value === null) {
          // The player must not have a weapon equipped
          return player.weapon === null;
        } else {
          // The player must have a weapon equipped with the given type
          return player.weapon && player.weapon.type === this.value;
        }
      case 'damage':
        // Check if the player has done enough damage
        // This type of condition is paired with a weapon condition
        
        if(!player.weapon) {
          // Check the player has done enough damage without a weapon
          return player.records['damage-dealt']['unarmed'] >= this.value;
        } else {
          // Check the player has done enough damage with the given weapon
          return player.records['damage-dealt'][player.weapon.type] >= this.value;
        }
      case 'skill': 
        // Check if the player has learned the given skill
        return player.skills.some(skill => skill.id === this.value);
      default:
        return false;
    }
  }
}

class Effect {
  constructor(data) {
    this.type = data.type;
    this.value = data.value;
  }
}