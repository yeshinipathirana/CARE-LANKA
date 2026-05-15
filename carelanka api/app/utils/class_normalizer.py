# app/utils/class_normalizer.py
# Maps all model class names → canonical names used in srilanka_nutrition.csv
# Handles: duplicates, case differences, generic classes

CLASS_MAP = {
    # Generic → specific (will be shown as-is but mapped for nutrition)
    "Curry":              "Dhal Curry",       # generic curry → default to dhal
    "Rice":               "White Rice",        # generic rice → white rice
    "rice":               "White Rice",
    "Dall":               "Dhal Curry",
    "salad":              "Vegetable Salad",

    # Duplicate capitalisation fixes
    "chicken curry":      "Chicken Curry",
    "Chicken":            "Chicken Curry",

    # Keep these as-is (already match CSV exactly)
    "White Rice":         "White Rice",
    "Basmathi Rice":      "Basmathi Rice",
    "Milk Rice":          "Milk Rice",
    "Fried Rice":         "Fried Rice",
    "Dhal Curry":         "Dhal Curry",
    "Chicken Curry":      "Chicken Curry",
    "Fish Curry":         "Fish Curry",
    "Bean Curry":         "Bean Curry",
    "Soya Curry":         "Soya Curry",
    "Bitter Gourd Curry": "Bitter Gourd Curry",
    "Brinjal":            "Brinjal Curry",
    "Pumpkin Curry":      "Pumpkin Curry",
    "Potato MilkyCurry":  "Potato Curry",
    "Fried Potato":       "Fried Potato",
    "Cashew Nuwt curry":  "Cashew Nut Curry",
    "Cauliflower curry":  "Cauliflower Curry",
    "Capsicum Curry":     "Capsicum Curry",
    "Mango Curry":        "Mango Curry",
    "Meat Curry":         "Meat Curry",
    "Shrimp Curry":       "Shrimp Curry",
    "Pea Curry":          "Pea Curry",
    "Polos Ambula":       "Polos Ambula",
    "Fish AmbulThiyal":   "Fish AmbulThiyal",
    "Coconut Relish":     "Coconut Relish",
    "Lunu Miris":         "Lunu Miris",
    "Mallum":             "Mallum",
    "Vegetable Salad":    "Vegetable Salad",
    "Pappadam":           "Papadam",
    "Boiled Eggs":        "Boiled Eggs",
    "Omlet":              "Omlet",
    "Fried Sprat":        "Fried Sprat",
    "Dried Halmasso":     "Dried Halmasso",
    "Grilled Fish":       "Grilled Fish",
    "Cutlet":             "Cutlet",
    "Hoppers":            "Hoppers",
    "Beetroot":           "Beetroot",
    "Cucumber":           "Cucumber",
    "Bonchi":             "Bean Curry",
    "Beat":               "Beetroot",

    # Non-Sri-Lankan foods (map to closest or keep name)
    "pasta":              "Pasta",
    "pizza":              "Pizza",
    "hamburger":          "Hamburger",
    "french fries":       "French Fries",
    "fries":              "French Fries",
    "fried chicken":      "Fried Chicken",
    "fried-chicken":      "Fried Chicken",
    "Fried-Egg":          "Boiled Eggs",
    "apple":              "Apple",
    "banana":             "Banana",
    "orange":             "Orange",
    "watermelon":         "Watermelon",
    "Biryani":            "Biryani",
    "Milo 180ml":         "Milo 180ml",
    "Roast Chicken":      "Chicken Curry",
}

# Classes to SKIP entirely — not food items relevant to calorie tracking
SKIP_CLASSES = {
    "Near_completion", "Pan_Process_Started", "Raw_maggie",
    "Blue_doughnut", "Green_doughnut", "Soft_bread", "Soft_sesame_bun",
    "ball", "bean", "castera", "foot", "guabaegi", "heart", "soboro",
    "Gol Gapy", "Jalebi", "Nan", "pakory",
    "cola", "Cola", "Gatorade", "Royal", "Sprite", "soda", "softdrink",
    "water", "juice", "tea_coffee", "tea", "coffee", "coffe",
    "oils", "spices", "sauce",
}

def normalize_class(raw_name: str) -> str | None:
    """
    Returns canonical food name for nutrition lookup.
    Returns None if the class should be skipped.
    """
    if raw_name in SKIP_CLASSES:
        return None
    return CLASS_MAP.get(raw_name, raw_name)
