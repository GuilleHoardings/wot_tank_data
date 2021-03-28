async function vehicles() {
  if (!isConfigValid()) {
    return;
  }

  updateProgress("Fetching vehicles...", restart = true);

  let url = "https://api.worldoftanks.eu/wot/encyclopedia/vehicles/?application_id=" + config.APP_ID;
  let response = await fetch(url);

  if (!response.ok) {
    alert("Response not OK");
    return;
  }

  let data = await response.json();

  var tankCount = data.meta.count;
  updateLog(new Date().toLocaleString() + ` There are ${tankCount} vehicles`);

  var fields = ["name", "short_name", "tier", "type", "nation", "prices_xp", "price_credit",
                "price_gold", "is_gift", "is_premium", "is_premium_igr", "is_wheeled"]
  extra_fields = ["hp", "hull_hp", "hull_weight", "weight", "speed_forward", "speed_backward",
                  "ammo.avg_penetration", "ammo.avg_damage", "dpm", "gun.name", "gun.fire_rate",
                  "gun.aim_time", "engine.power"];

  var csv = "";
  for (var i = 0; i < fields.length; i++) {
    csv += fields[i] + ";";
  }

  for (var i = 0; i < extra_fields.length; i++) {
    csv += extra_fields[i] + ";";
  }

  csv += "gun;engine;radio;turret;suspension;\n"

  var row = 2;
  var currentTank = 0;
  var totalConfigurations = 0;
  for (var tank in data.data) {
    var tank = data.data[tank];
    var tankName = tank["name"];
    var progress = currentTank * 100 / tankCount;


    var configurations = tank["guns"].length * tank["engines"].length * tank["radios"].length * tank["suspensions"].length;
    if (tank["turrets"].length > 0) {
      configurations = configurations * tank["turrets"].length;
    }

    totalConfigurations += configurations;
    var configurationSuccesses = 0;
    var configurationFailures = 0;
    updateLog(`#${currentTank} ${tankName} (tank_id: ${tank["tank_id"]})`);
    updateLog(`    There are ${configurations} configurations`);

    currentTank++;
    updateProgress(`[${progress.toFixed(2)}%] Fecthing ${tankName}`, restart = true);

    //if (row > 15) break;

    for (var g = 0; g < tank["guns"].length; g++) {
      var gun = tank["guns"][g];

      for (var e = 0; e < tank["engines"].length; e++) {
        var engine = tank["engines"][e];

        for (var r = 0; r < tank["radios"].length; r++) {
          var radio_mod = tank["radios"][r];

          for (var s = 0; s < tank["suspensions"].length; s++) {
            var suspension = tank["suspensions"][s];

            if (tank["turrets"].length == 0) {
              // TODO: refactor
              csv_row = await row_vehicle(tank, fields, extra_fields, gun, engine, radio_mod, null, suspension);
              if (csv_row != "") {
                configurationSuccesses++;
              } else {
                configurationFailures++;
              }
              csv += csv_row;
              row++;
            }

            for (var t = 0; t < tank["turrets"].length; t++) {
              var turret = tank["turrets"][t];

              csv_row = await row_vehicle(tank, fields, extra_fields, gun, engine, radio_mod, turret, suspension);
              if (csv_row != "") {
                configurationSuccesses++;
              } else {
                configurationFailures++;
              }
              csv += csv_row;
              row++;
            }
          }
        }
      }
    }
    updateLog(`    Successes: ${configurationSuccesses} Failures: ${configurationFailures} `);
  }

  updateLog(new Date().toLocaleString() + ` Done`);
  updateProgress("");

  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], {
    type: "text/plain"
  }));
  a.setAttribute("download", "wot_data.csv");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  //window.open('data:text/csv;charset=utf-8,' + escape(csv));
}


async function row_vehicle(tank, fields, extra_fields, gun, engine, radio_mod, turret, suspension) {
  let tank_id = tank["tank_id"];
  let tankName = tank["name"];

  let url = `https://api.worldoftanks.eu/wot/encyclopedia/vehicleprofile/`
    + `?application_id=` + config.APP_ID
    + `&tank_id=${tank_id}`
    + `&gun_id=${gun}`
    + `&engine_id=${engine}`
    + `&radio_id=${radio_mod}`
    + `&suspension_id=${suspension}`
    ;
  if (turret != null) {
    url += `&turret_id=${turret}`
  }
  let response = await fetch(url);

  if (!response.ok) {
    updateProgress(`Error for ${tankName}: ${response.error.message}`);
    return "";
  }

  let data = await response.json();

  if (data["data"] === undefined) {
    console.log(`Data undefined error for ${tankName}: ${data.error.message}`);
    return "";
  }

  for (tankDataKey in data["data"]) {
    var tankData = data["data"][tankDataKey];

    var row_data = fieldsToStr(fields, tank) + fieldsToStr(["hp", "hull_hp", "hull_weight", "weight", "speed_forward", "speed_backward"], tankData);

    var avg_penetration = tankData["ammo"][0]["penetration"][1];
    var avg_damage = tankData["ammo"][0]["damage"][1]
    var fire_rate = tankData["gun"]["fire_rate"]
    var dpm = fire_rate * avg_damage
    row_data += avg_penetration + ";"
      + avg_damage + ";"
      + dpm.toFixed(2) + ";"
      + tankData["gun"]["name"] + ";"
      + fire_rate + ";"
      + tankData["gun"]["aim_time"] + ";"
      + tankData["engine"]["power"] + ";";

    row_data += gun + ";"
      + engine + ";"
      + radio_mod + ";"
      + turret + ";"
      + suspension + ";";
  }

  return row_data + "\n";
}


function updateDiv(divName, msg, restart = false) {
  var progress = document.getElementById(divName);

  if (restart) {
    progress.innerHTML = "";
  }

  progress.innerHTML += msg + "<br />";

}

function updateProgress(msg, restart = false) {
  updateDiv('progress', msg, restart);
}

function updateLog(msg, restart = false) {
  updateDiv('log', msg, restart);
}

function fieldsToStr(fields, array) {
  var result = "";

  for (var i = 0; i < fields.length; i++) {
    field = fields[i];
    result += array[field] + ";";
  }

  return result;
}


function isConfigValid() {
  if (typeof config != "undefined" && typeof config.APP_ID != "undefined") {
    updateLog("APP_ID used: " + config.APP_ID);
    return true;
  }

  updateLog("There's no config.APP_ID in config.js.");
  return false;
}
