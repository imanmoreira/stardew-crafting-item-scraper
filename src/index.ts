import * as cheerio from "cheerio";
import Axios from "axios";

const countRegex = /\s*[(](\d*)[)]/;

const fs = require("fs");
const loadAndParseUserFile = (isIman: boolean) => {
  const userKeyword = isIman ? "Iman" : "Brian";
  const arr = readFileLines(userKeyword);
  loadAllStardewCraftables(arr).then((allItemsMapping) => {
    writeFile(allItemsMapping, userKeyword);
  });
};

const readFileLines = (fileKeyword: string) =>
  fs
    .readFileSync(`src/allCraftingItems${fileKeyword}.txt`)
    .toString("UTF8")
    .split("\r\n");

const writeFile = (json: any, fileKeyword: string) =>
  fs.writeFileSync(`results${fileKeyword}.json`, JSON.stringify(json, null, 2));

const loadAllStardewCraftables = (itemNames: string[]) => {
  return Promise.all(
    itemNames.map((itemName) => loadOneStardewCraftable(itemName))
  ).then((itemMappings) => {
    return itemNames.reduce<
      [{ [ingreName: string]: any }, { [ingreName: string]: any }]
    >(
      ([itemsMap, allItems], item, index) => {
        const realItemMappings = itemMappings[index] || {};
        itemsMap[item] = realItemMappings;
        Object.keys(realItemMappings).forEach(
          (itemName) =>
            (allItems[itemName] =
              (allItems[itemName] || 0) + realItemMappings[itemName])
        );
        return [itemsMap, allItems];
      },
      [{}, {}]
    );
  });
};

const loadOneStardewCraftable = (itemName: string) => {
  const link = `https://stardewvalleywiki.com/${itemName.replaceAll(" ", "_")}`;
  return Axios.get(link)
    .then(({ data }) => cheerio.load(data))
    .then(($) => parseStardewCraftable($))
    .catch((err) => {});
};

const parseStardewCraftable = ($: CheerioStatic) => {
  const x = $("#content #infoboxtable tbody")
    .children()
    .filter((_, element) => {
      const ele = $(element);
      return ele.find("#infoboxsection").text().includes("Ingredients");
    });

  if (x.length === 0) {
    return {};
  }

  const ingredients = x.find("#infoboxdetail .nametemplate");
  const ingredientMapping: { [ingreName: string]: number } = {};
  ingredients.each((_, ingredient) => {
    const ingredientName = $(ingredient).find("a").text();
    const ingredientCount = ingredient.lastChild.data?.match(countRegex) || [];
    if (ingredientName) {
      ingredientMapping[ingredientName] =
        ingredientCount.length === 2 ? Number(ingredientCount[1]) : 0;
    }
  });
  return ingredientMapping;
};

loadAndParseUserFile(false);
