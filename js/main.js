const ELTS = {
  'tabs': document.querySelectorAll('.tab'),
  'tab-btns': document.querySelectorAll('.tab-btn'),
  'log': document.querySelector('#log'),

  'combat-div': document.querySelector('#combat-div'),
  'loot': document.querySelector('#loot'),
  'loot-div': document.querySelector('#loot-div'),
  'loot-info': document.querySelector('#loot-info'),
  'loot-cost': document.querySelector('#loot-cost'),
  'loot-roll': document.querySelector('#loot-roll'),
  'loot-confirm': document.querySelector('#loot-confirm'),

  'player-health': document.querySelector('#health'),
  'player-damage': document.querySelector('#damage'),
  'player-defense': document.querySelector('#defense'),

  'mob-info': document.querySelector('#mob-info'),
  'mob-health': document.querySelector('#mob-health'),
  'mob-damage': document.querySelector('#mob-damage'),
  'mob-defense': document.querySelector('#mob-defense'),

};

/**
 * @type {Skill[]}
 */
const skills = [];
const mobs = [];
const items = [];
const areas = [];

const lang = {};

let currentLanguage = 'en';

let player = {
  level: 1,
  exp: {current: 0, toNextLevel: 100},
  maxHealth: 10,
  health: 10,
  stats: {
    strength: 1,
    dexterity: 1,
    intelligence: 1,
    luck: 0
  },
  area: null,
  skills: [],
  inventory: [],

  get damage() {
    // TODO: calculate damage
    return {min: 0, max: this.stats.strength};
  },

  get defense() {
    // TODO: calculate defense
    return {min: 0, max: this.stats.dexterity};
  },

  get weapon() {
    // The weapon is an equipped item of type Weapon in the inventory
    let weapon = this.inventory.find(item => item instanceof Weapon);

    if(weapon) {
      return weapon;
    } else {
      return null; // no weapon = unarmed
    }
  },

  records: {}
}

let currentMob = null;

// Maybe all this should somewhere else?
let selectedLoot = [];
let lootRoll = 0;

let turn = 0;

async function setup() {
  await getData();
  await loadLanguages();

  updatePlayer();
  updateCombat();
  updateMap();
}

/**
 * Roll for something
 * @param {Object} target The target to roll for, can be a mob, loot item, etc.
 */
function roll(target) {
  switch(target) {
    case 'mob':
      // First get all the mobs that can exist in this area
      let possibleMobs = mobs.filter(mob => mob.area === player.area);
      
      // Then pick one at random
      currentMob = new Mob(random(possibleMobs));
      
      log(`You have encountered a level ${currentMob.level} ${currentMob.name}`);

      // Update the UI
      updateCombat();
      break;
    case 'loot':
      // Loot roll will be a number between lowest cost and highest cost of the mobs loot
      // Find the lowest cost and highest cost of the loot
      let lowestCost = Infinity;
      let highestCost = -Infinity;
      for(let loot of currentMob.loot) {
        if(loot.cost < lowestCost) {
          lowestCost = loot.cost;
        }
        if(loot.cost > highestCost) {
          highestCost = loot.cost;
        }
      }

      // Roll a number between the lowest cost and highest cost
      lootRoll = random(lowestCost, highestCost);

      // Show the loot roll
      ELTS['loot-roll'].innerHTML = `Loot roll: ${lootRoll}`;

      // Hide the button and show the loot confirmation button
      ELTS['loot'].classList.add('hidden');
      ELTS['loot-confirm'].classList.remove('hidden');

      break;
  }
}

function handleCombat() {
  if(player.health > 0 && currentMob.health > 0) {
    // Player turn
    if(turn === 0) {
      let playerDamage = random(player.damage.min, player.damage.max+1);
      let mobDefense = random(currentMob.defense.min, currentMob.defense.max);
      let damage = (playerDamage - mobDefense) > 0 ? (playerDamage - mobDefense) : 0;

      currentMob.health -= damage;

      if(damage > 0) {
        // We managed to deal damage
        // Add the damage to the corresponding record of the weapon
        player.records['damage-dealt'] = player.records['damage-dealt'] || {};
      
        // Check the weapon
        let weapon = player.weapon;
        if(weapon) {
          // Add the damage to the weapon record
          player.records['damage-dealt'][weapon.type] = player.records['damage-dealt'][weapon.type] || 0;
          player.records['damage-dealt'][weapon.type] += damage;
        } else {
          // No weapon, add the damage to the unarmed record
          player.records['damage-dealt']['unarmed'] = player.records['damage-dealt']['unarmed'] || 0;
          player.records['damage-dealt']['unarmed'] += damage;
        }

        // Check if we can unlock a combat skill
        // Also make sure we don't unlock the same skill twice
        for(let skill of skills) {
          if(skill.canUnlock(player) && !player.skills.includes(skill)) {
            player.skills.push(skill);
            log(`You unlocked the ${skill.name} skill!`);
          }
        }
      }

      log(`You dealt ${damage} (${playerDamage}-${mobDefense}) damage to ${currentMob.name}`);

      updateCombat();
      
      turn = 1;

      if(currentMob.health <= 0) {
        player.exp.current += currentMob.level;

        log(`You have defeated ${currentMob.name} and gained ${currentMob.level} exp.`);

        // Show the loot screen
        show(ELTS['loot-div']);
        hide(ELTS['combat-div']);

        showLoot(currentMob.loot);

        updatePlayer();

        if(player.exp.current >= player.exp.toNextLevel) {
          // Level up
          player.level++;
          player.exp.current = 0;
          player.exp.toNextLevel *= 2;
          player.maxHealth += 10;
          player.health = player.maxHealth;
          updatePlayer();
        }
      }
    } else {
      // Mob turn
      let mobDamage = random(currentMob.damage.min, currentMob.damage.max+1);
      let playerDefense = random(player.defense.min, player.defense.max);
      let damage = mobDamage - playerDefense;

      player.health -= damage;
      log(`${currentMob.name} dealt ${damage} (${mobDamage}-${playerDefense}) damage to Player`);

      updatePlayer();
      updateCombat();

      turn = 0;

      if(player.health <= 0) {
        // Player is dead
        player.health = player.maxHealth;
        currentMob = null;

        log(`You have died!`, 'red');

        hide(ELTS['combat-div']);

        updatePlayer();
        updateCombat();
      }
    }
  }
}

/** 
 * Give the selected loot to the player
 */
function handleLoot() {
  // Add the loot to the player's inventory
  for(let loot of selectedLoot) {
    player.inventory.push(loot.item);
  }

  // Log the loot gained
  let lootGained = selectedLoot.map(loot => loot.item.name).join(', ');
  log(`You gained ${lootGained}.`);

  lootRoll = 0;
  selectedLoot = [];
  currentMob = null;

  // Clear the loot info
  ELTS['loot-info'].innerHTML = '';

  // Hide the loot div
  hide(ELTS['loot-div']);

  updateCombat();
  updatePlayer();

}

// UPDATE THE UI
function updatePlayer() {
  // Get the player tab
  const playerTab = ELTS.tabs[1];
  
  // Get the player tab's content
  const statsTabContent = playerTab.querySelector('.tab-content');

  statsTabContent.innerHTML = '';

  // Show the player's lvl and exp
  statsTabContent.innerHTML += `<p>Level: ${player.level}</p>`;
  statsTabContent.innerHTML += `<p>Exp: ${player.exp.current}/${player.exp.toNextLevel}</p>`;

  // Show the player's health
  statsTabContent.innerHTML += `<p>Health: ${player.health}/${player.maxHealth}</p>`;

  // Show the player's stats
  statsTabContent.innerHTML += `<p>Stats: </p>`;
  for(let stat in player.stats) {
    const statElt = document.createElement('p');
    statElt.classList.add('stat');
    statElt.innerHTML = `${stat}: ${player.stats[stat]}`;

    statsTabContent.appendChild(statElt);
  }

  // Show skills
  statsTabContent.innerHTML += `<p>Skills: 
    ${player.skills.map(skill => skill.name).join(', ')}</p>`;
  
  // Show inventory
  statsTabContent.innerHTML += `<p>Inventory: `;
  let inventoryDiv = showInventory();

  statsTabContent.appendChild(inventoryDiv);

}

function updateCombat() {
  // Get the mob tab
  const mobTab = ELTS.tabs[0];
  const mobTabContent = mobTab.querySelector('.tab-content');

  // Are we in combat?
  if(currentMob) {
    show(ELTS['combat-div']);
    // Show the player's info
    ELTS['player-health'].innerHTML = 
      `Health: ${player.health}/${player.maxHealth}`;
    ELTS['player-damage'].innerHTML = 
      `Damage: ${showRange(player.damage)}`;
    ELTS['player-defense'].innerHTML =
      `Defense: ${showRange(player.defense)}`;

    // Show the mob's info
    ELTS['mob-info'].innerHTML = `${currentMob.name} Level ${currentMob.level}`;
    ELTS['mob-health'].innerHTML = 
      `Health: ${currentMob.health}/${currentMob.maxHealth}`;
    ELTS['mob-damage'].innerHTML = 
      `Damage: ${showRange(currentMob.damage)}`;
    ELTS['mob-defense'].innerHTML = 
      `Defense: ${showRange(currentMob.defense)}`;
    
  } else if(currentMob === null && player.area === null) {
    hide(ELTS['combat-div']);
  } else if(currentMob === null && player.area) {
    let areaMobs = document.querySelector('#area-mobs');
    if(!areaMobs) {
      areaMobs = document.createElement('div');
      areaMobs.id = 'area-mobs';

      let rollBtn = document.createElement('button');
      rollBtn.innerHTML = 'Roll for a mob';
      rollBtn.addEventListener('click', () => {
        roll('mob');
        hide(areaMobs);
      });

      areaMobs.appendChild(rollBtn);

      for(let mob of mobs) {
        if(mob.area === player.area) {
          let mobElt = document.createElement('p');
          mobElt.classList.add('mob');
          mobElt.innerHTML = lang[currentLanguage][mob.id]

          areaMobs.appendChild(mobElt);
        }
      }
    } else {
      // Update the area mobs
      show(areaMobs);
    }

    mobTabContent.appendChild(areaMobs);
  }
}

function updateMap() {
  // Get the map tab
  const mapTab = ELTS.tabs[2];

  // Get the map tab's content
  const mapTabContent = mapTab.querySelector('.tab-content');

  mapTabContent.innerHTML = '';

  // Show the current area
  mapTabContent.innerHTML += `<p>Current area: ${capitalize(player.area || 'nowhere')}</p>`;

  // Show all the areas
  for(let area of areas) {
    let areaElt = document.createElement('p');
    areaElt.classList.add('area');
    areaElt.innerHTML = capitalize(area.name);

    let enterBtn = document.createElement('button');
    enterBtn.innerHTML = 'Enter';
    enterBtn.addEventListener('click', () => {
      player.area = area.id;
      updateMap();
      updateCombat();
    });
    if(player.area === area.id) {
      enterBtn.disabled = true;
    }

    areaElt.appendChild(enterBtn);

    mapTabContent.appendChild(areaElt);
  }
}

/**
 * Show the loot
 * @param {Array<Object>} loot The loot to show
 */
function showLoot(loot) {
  // Go through all the loot and show them in the loot window
  for(let item of loot) {
    let br = document.createElement('br');
    let lootElt = document.createElement('p');
    lootElt.classList.add('loot-item');
    
    let name = document.createElement('span');
    name.innerHTML = item.item.name;

    let cost = document.createElement('span');
    cost.innerHTML = `Cost: ${item.cost}`;

    lootElt.addEventListener('click', () => {
      // Add the loot item to selected loot or remove it
      if(lootRoll != 0) {
        if(selectedLoot.includes(item)) {
          selectedLoot.splice(selectedLoot.indexOf(item), 1);
          lootElt.classList.remove('selected');
        } else {
          selectedLoot.push(item);
          lootElt.classList.add('selected');
        }

        let lootCost = selectedLoot.reduce((acc, item) => acc + item.cost, 0);

        ELTS['loot-cost'].innerHTML = `${lootCost}`;
        
        // If the loot cost is greater than the player's loot roll, disable the loot button
        // also show the cost as red
        if(lootCost > lootRoll) {
          ELTS['loot-confirm'].disabled = true;
          ELTS['loot-cost'].style.color = 'red';
        } else {
          ELTS['loot-confirm'].disabled = false;
          ELTS['loot-cost'].style.color = 'black';
        }
      }
    });

    lootElt.appendChild(name);
    lootElt.appendChild(br);
    lootElt.appendChild(cost);

    ELTS['loot-info'].appendChild(lootElt);
  }
  
}

/**
 * Show an item in the inventory
 */
function showInventory() {
  let inventoryDiv = document.createElement('div');
  inventoryDiv.classList.add('inventory');

  // Count how many of each item we have
  let itemCounts = {};
  for(let item of player.inventory) {
    if(itemCounts[item.name]) {
      itemCounts[item.name]++;
    } else {
      itemCounts[item.name] = 1;
    }
  }

  // Show all the items
  for(let item in itemCounts) {
    let itemElt = document.createElement('p');
    itemElt.classList.add('item');
    itemElt.innerHTML = `${item} (${itemCounts[item]})`;

    inventoryDiv.appendChild(itemElt);
  }

  return inventoryDiv;
}

function log(message, color) {
  let msg = document.createElement('p');
  msg.innerHTML = message;
  msg.classList.add('logMsg');
  if(color) {
    msg.style.color = color;
  }
  ELTS['log'].prepend(msg);

  ELTS['log'].scrollTop = 0;

  if(ELTS['log'].childElementCount > 100) {
    ELTS['log'].removeChild(ELTS['log'].firstChild);
  }
}

// EVENT LISTENERS

// Tab buttons to switch between tabs
for (let i = 0; i < ELTS['tab-btns'].length; i++) {
  ELTS['tab-btns'][i].addEventListener('click', function(e) {
    // If the tab is already active, don't do anything
    if (!ELTS['tabs'][i].classList.contains('hidden')) {
      return;
    }

    show(ELTS['tabs'][i]);

    // Add the hidden class to all other tabs
    for (let j = 0; j < ELTS['tabs'].length; j++) {
      if (j !== i) {
        ELTS['tabs'][j].classList.add('hidden');
      }
    }
  });
}

// Get all the data from the JSON files in the data folder
async function getData() {
  return Promise.all([
    getFileContents('data/skills.json', 'json'),
    getFileContents('data/mobs.json', 'json'),
    getFileContents('data/items.json', 'json'),
    getFileContents('data/areas.json', 'json'),
  ]).then(([skillsData, mobsData, itemsData, areasData]) => {
    skillsData.forEach(skill => {
      skills.push(new Skill(skill));
    });
    mobsData.forEach(mob => {
      mobs.push(mob);
    });
    itemsData.forEach(item => {
      items.push(item);
    });
    areasData.forEach(area => {
      areas.push(new Area(area));
    });
  }
  );
}

async function loadLanguages() {
  return Promise.all([
    getFileContents('lang/en.json', 'json'),
  ]).then(([langDataEn]) => {
    lang['en'] = langDataEn;
  });
}