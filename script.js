const API_URL = "https://api.coinlore.net/api/tickers/";

const COIN_ID_MAPPING = {
    bitcoin: "bitcoin",
    ethereum: "ethereum",
    "binance-coin": "binancecoin",
    algorand: "algorand",
    solana: "solana",
    ripple: "ripple",
    cardano: "cardano",
    polkadot: "polkadot",
    "dogecoin": "dogecoin"
};

const TRADINGVIEW_SYMBOLS = {
    bitcoin: "BINANCE:BTCUSDT",
    ethereum: "BINANCE:ETHUSDT",
    "binance-coin": "BINANCE:BNBUSDT",
    algorand: "BINANCE:ALGOUSDT",
    solana: "BINANCE:SOLUSDT",
    ripple: "BINANCE:XRPUSDT",
    cardano: "BINANCE:ADAUSDT",
    polkadot: "BINANCE:DOTUSDT",
    dogecoin: "BINANCE:DOGEUSDT"
};

// Load saved portfolio and balance from localStorage
let portfolio = JSON.parse(localStorage.getItem("portfolio")) || {
    bitcoin: { quantity: 0, value: 0 },
    ethereum: { quantity: 0, value: 0 },
    "binance-coin": { quantity: 0, value: 0 },
    algorand: { quantity: 0, value: 0 },
    solana: { quantity: 0, value: 0 }
};

let balance = parseFloat(localStorage.getItem("balance")) || 100000; // Default balance

// Save portfolio and balance to localStorage
function saveData() {
    localStorage.setItem("portfolio", JSON.stringify(portfolio));
    localStorage.setItem("balance", balance.toString());
}

const CRYPTO_LOGOS = {
    bitcoin: "assets/logos/BTCLogo.png",
    ethereum: "assets/logos/ETHLogo.png",
    "binance-coin": "assets/logos/BNBLogo.png",
    algorand: "assets/logos/AlgoLogo.png",
    solana: "assets/logos/SOLLogo.png",
    ripple: "assets/logos/XRPLogo.png",
    cardano: "assets/logos/ADALogo.png",
    polkadot: "assets/logos/DotLogo.png",
    dogecoin: "assets/logos/DogeLogo.png"
};



async function updatePortfolioDisplay() {
    const portfolioTable = document.getElementById("portfolio-data");

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        for (const [crypto, details] of Object.entries(portfolio)) {
            if (details.quantity > 0) {
                const coin = data.data.find((c) => c.nameid === crypto);
                const currentPrice = coin ? parseFloat(coin.price_usd) : 0;
                const currentValue = details.quantity * currentPrice;

                // Check if a row for this coin already exists
                let row = portfolioTable.querySelector(`tr[data-crypto="${crypto}"]`);
                if (!row) {
                    // Create a new row if it doesn't exist
                    row = document.createElement("tr");
                    row.setAttribute("data-crypto", crypto);
                    row.innerHTML = `
                        <td>
                            <img src="${CRYPTO_LOGOS[crypto]}" alt="${crypto}" class="crypto-logo">
                            ${crypto === "binance-coin" ? "BNB" : crypto.charAt(0).toUpperCase() + crypto.slice(1)}
                        </td>
                        <td class="portfolio-quantity">${details.quantity.toFixed(6)}</td>
                        <td class="portfolio-value">$${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    `;
                    portfolioTable.appendChild(row);
                } else {
                    // Update the existing row's quantity and value
                    row.querySelector(".portfolio-quantity").textContent = details.quantity.toFixed(6);
                    row.querySelector(".portfolio-value").textContent = `$${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
                }

                // Update the portfolio value in the object
                portfolio[crypto].value = currentValue;
            }
        }
    } catch (error) {
        console.error("Error updating portfolio:", error);
    }
}




function updateBalanceDisplay() {
    document.getElementById("account-balance").textContent = `Balance: $${balance.toLocaleString()}`;
}

async function fetchCryptoPrices() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        const tableBody = document.getElementById("crypto-data");
        tableBody.innerHTML = ""; // Clear table before repopulating

        data.data.forEach((coin) => {
            if (Object.keys(COIN_ID_MAPPING).includes(coin.nameid)) {
                const hourlyChange = parseFloat(coin.percent_change_1h);
                const hourlyChangeColor = hourlyChange >= 0 ? "green" : "red";

                const displayName = coin.nameid === "binance-coin" ? "BNB" : coin.name;

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>
                        <img src="${CRYPTO_LOGOS[coin.nameid]}" alt="${coin.name}" class="crypto-logo">
                        ${displayName}
                    </td>
                    <td>$${parseFloat(coin.price_usd).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style="color: ${hourlyChangeColor};">
                        ${hourlyChange >= 0 ? "+" : ""}${hourlyChange.toFixed(2)}%
                    </td>
                `;
                tableBody.appendChild(row);
            }
        });
    } catch (error) {
        console.error("Error fetching cryptocurrency prices:", error);
    }
}




async function handleTrade(type) {
    const crypto = document.getElementById("crypto-select").value;
    const amount = parseFloat(document.getElementById("trade-amount").value);

    if (!portfolio[crypto]) {
        console.error(`Portfolio entry not found for: ${crypto}`);
        alert("Selected cryptocurrency not found in the portfolio.");
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
    }

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        const coin = data.data.find((c) => c.nameid === crypto);
        if (!coin) {
            console.error(`Coin not found for nameid: ${crypto}`);
            alert("Selected cryptocurrency not found in the API response.");
            return;
        }

        const cryptoPrice = parseFloat(coin.price_usd);

        if (type === "buy") {
            if (amount > balance) {
                alert("Insufficient balance.");
                return;
            }

            const quantity = amount / cryptoPrice;
            portfolio[crypto].quantity += quantity;
            balance -= amount;
        } else if (type === "sell") {
            const quantityToSell = amount / cryptoPrice;
            if (quantityToSell > portfolio[crypto].quantity) {
                alert("Insufficient quantity to sell.");
                return;
            }

            portfolio[crypto].quantity -= quantityToSell;
            balance += amount;
        }

        updatePortfolioDisplay();
        updateBalanceDisplay();
        saveData(); // Save updated data
        alert(`Trade successful! Remaining balance: $${balance.toLocaleString()}`);
    } catch (error) {
        console.error("Error during trade:", error);
        alert("An error occurred during the trade. Please try again.");
    }
}

function loadTradingViewChart(symbol) {
    if (!symbol) {
        console.error("TradingView symbol not found.");
        return;
    }

    document.getElementById("tradingview-chart").innerHTML = "";

    new TradingView.widget({
        container_id: "tradingview-chart",
        autosize: true,
        symbol: symbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "light",
        style: "1",
        locale: "en",
        enable_publishing: false,
        allow_symbol_change: true,
        details: true,
        hotlist: true,
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("buy-button").addEventListener("click", () => {
        handleTrade("buy");
    });

    document.getElementById("sell-button").addEventListener("click", () => {
        handleTrade("sell");
    });

    document.getElementById("crypto-select").addEventListener("change", (event) => {
        const selectedCrypto = event.target.value;
        const symbol = TRADINGVIEW_SYMBOLS[selectedCrypto];
        if (symbol) {
            loadTradingViewChart(symbol);
        } else {
            console.error(`TradingView symbol not found for: ${selectedCrypto}`);
        }
    });

    fetchCryptoPrices();
    updatePortfolioDisplay();
    updateBalanceDisplay();

    // Load default chart (Bitcoin) on page load
    loadTradingViewChart(TRADINGVIEW_SYMBOLS["bitcoin"]);
});


let styxBalance = parseFloat(localStorage.getItem("styxBalance")) || 0; // Load from localStorage or default to 0
let rewardInterval = 3 * 60 * 1000; // 3 minutes in milliseconds

// Function to calculate ALGO holdings in USD
async function getAlgoHoldingsInUSD() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        const algoData = data.data.find((coin) => coin.nameid === "algorand");
        const algoPrice = algoData ? parseFloat(algoData.price_usd) : 0;
        const algoHoldings = portfolio["algorand"].quantity || 0;

        // Calculate ALGO holdings in USD
        return algoHoldings * algoPrice;
    } catch (error) {
        console.error("Error fetching ALGO price:", error);
        return 0;
    }
}

// Function to save Styx balance to localStorage
function saveStyxBalance() {
    localStorage.setItem("styxBalance", styxBalance.toString());
}

// Function to update the Styx balance display
function updateStyxBalanceDisplay() {
    const styxBalanceElement = document.getElementById("styx-balance");
    if (styxBalanceElement) {
        styxBalanceElement.textContent = `Styx Balance: ${styxBalance.toFixed(2)}`;
    }
}

// Function to distribute Styx rewards
async function distributeStyxRewards() {
    const algoHoldingsInUSD = await getAlgoHoldingsInUSD();

    if (algoHoldingsInUSD > 0) {
        const reward = algoHoldingsInUSD * 0.01; // 1% of ALGO holdings in USD
        styxBalance += reward;

        // Update and save last reward
        lastReward = reward;
        saveLastReward();
        saveStyxBalance();

        // Update the UI
        updateStyxBalanceDisplay();
        updateLastRewardDisplay();
        console.log(`Reward distributed: ${reward.toFixed(2)} Styx`);
    } else {
        console.log("No ALGO holdings, no rewards distributed.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    styxBalance = parseFloat(localStorage.getItem("styxBalance")) || 0;
    lastReward = parseFloat(localStorage.getItem("lastReward")) || 0;

    startRewardSystem();
    updateStyxBalanceDisplay();
    updateLastRewardDisplay(); // Ensure the last reward is displayed initially
});



// Function to update the Styx balance display
function updateStyxBalanceDisplay() {
    const styxBalanceElement = document.getElementById("styx-balance");
    if (styxBalanceElement) {
        styxBalanceElement.textContent = `Styx Balance: ${styxBalance.toFixed(2)}`;
    }
}

// Start the reward system
function startRewardSystem() {
    // Distribute rewards every 20 minutes
    setInterval(distributeStyxRewards, rewardInterval);
}

// Initialize the reward system on page load
document.addEventListener("DOMContentLoaded", () => {
    startRewardSystem();
    updateStyxBalanceDisplay(); // Ensure balance is displayed initially
});


function saveStyxBalance() {
    localStorage.setItem("styxBalance", styxBalance.toString());
}

let lastReward = parseFloat(localStorage.getItem("lastReward")) || 0;

// Save lastReward to localStorage
function saveLastReward() {
    localStorage.setItem("lastReward", lastReward.toString());
}

// Update the last reward display
function updateLastRewardDisplay() {
    const lastRewardElement = document.getElementById("last-reward");
    if (lastRewardElement) {
        lastRewardElement.textContent = `Last Reward: ${lastReward.toFixed(2)} Styx`;
    }
}

// Swap STYX for USD with live calculation
function swapStyxForUSD(styxAmount) {
    const exchangeRate = 0.5; // 1 STYX = $1
    const usdEquivalent = styxAmount * exchangeRate;

    if (styxAmount <= 0 || isNaN(styxAmount)) {
        alert("Please enter a valid STYX amount.");
        return;
    }

    if (styxAmount > styxBalance) {
        alert("Insufficient STYX balance for this swap.");
        return;
    }

    // Deduct STYX and add USD to the wallet balance
    styxBalance -= styxAmount;
    balance += usdEquivalent;

    // Save the updated balances
    saveStyxBalance();
    saveData();

    // Update the UI
    updateStyxBalanceDisplay();
    updateBalanceDisplay();

    alert(`Successfully swapped ${styxAmount.toFixed(2)} STYX for $${usdEquivalent.toFixed(2)}!`);
}

// Dynamically update exchange display
function updateExchangeDisplay() {
    const input = document.getElementById("swap-styx-amount");
    const exchangeDisplay = document.getElementById("exchange-display");

    const styxAmount = parseFloat(input.value);
    const exchangeRate = 0.5; // 1 STYX = $1
    const usdEquivalent = styxAmount > 0 ? styxAmount * exchangeRate : 0;

    if (exchangeDisplay) {
        exchangeDisplay.textContent = ` $${usdEquivalent.toFixed(2)} MUSD`;
    }
}

function updateTotalWalletBalance() {
    const cryptoValueElement = document.getElementById("crypto-value");
    const totalWalletElement = document.getElementById("total-wallet-balance");
    let totalCryptoValue = 0;

    // Calculate total crypto value in the portfolio
    for (const [crypto, details] of Object.entries(portfolio)) {
        totalCryptoValue += details.value || 0; // Use the pre-calculated value from the portfolio
    }

    // Total Wallet = Total Crypto Value + MUSD Balance
    const totalWalletBalance = totalCryptoValue + balance;

    // Update the display
    cryptoValueElement.textContent = `Total Crypto Value: $${totalCryptoValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
    totalWalletElement.textContent = `Total Wallet Balance: $${totalWalletBalance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

// Event listeners for the swap button and live calculation
document.addEventListener("DOMContentLoaded", () => {
    const swapButton = document.getElementById("swap-styx-button");
    const styxInput = document.getElementById("swap-styx-amount");

    if (styxInput) {
        styxInput.addEventListener("input", updateExchangeDisplay);
    }

    if (swapButton) {
        swapButton.addEventListener("click", () => {
            const styxAmount = parseFloat(styxInput.value);
            swapStyxForUSD(styxAmount);
        });
    }
});

// Function to calculate the amount of crypto for a given USD amount
async function calculateCryptoAmount() {
    const crypto = document.getElementById("crypto-select").value;
    const amount = parseFloat(document.getElementById("trade-amount").value);
    const cryptoDisplay = document.getElementById("crypto-amount-display");

    if (isNaN(amount) || amount <= 0) {
        cryptoDisplay.textContent = "Enter a valid amount.";
        return;
    }

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        const coin = data.data.find((c) => c.nameid === crypto);

        if (!coin) {
            cryptoDisplay.textContent = "Cryptocurrency not found.";
            return;
        }

        const cryptoPrice = parseFloat(coin.price_usd);
        const cryptoAmount = amount / cryptoPrice;

        // Update the display with the calculated amount
        cryptoDisplay.textContent = `You will get approximately ${cryptoAmount.toFixed(6)} ${crypto.toUpperCase()}`;
    } catch (error) {
        console.error("Error calculating crypto amount:", error);
        cryptoDisplay.textContent = "Error calculating amount.";
    }
}

// Add an event listener to update the crypto amount dynamically
document.addEventListener("DOMContentLoaded", () => {
    const tradeAmountInput = document.getElementById("trade-amount");
    if (tradeAmountInput) {
        tradeAmountInput.addEventListener("input", calculateCryptoAmount);
    }
});


// Function to calculate and display total crypto value in USD
async function updateTotalCryptoValue() {
    const cryptoValueElement = document.getElementById("crypto-value");
    let totalCryptoValue = 0;

    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        for (const [crypto, details] of Object.entries(portfolio)) {
            if (details.quantity > 0) {
                const coin = data.data.find((c) => c.nameid === crypto);
                const currentPrice = coin ? parseFloat(coin.price_usd) : 0;
                totalCryptoValue += details.quantity * currentPrice;
            }
        }


        
        // Update the display
        cryptoValueElement.textContent = `Total Crypto Value: $${totalCryptoValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    } catch (error) {
        console.error("Error updating total crypto value:", error);
        cryptoValueElement.textContent = "Total Crypto Value: Error";
    }
}

// Call this function whenever the portfolio or prices are updated
document.addEventListener("DOMContentLoaded", () => {
    updateTotalCryptoValue();
   


});

document.addEventListener("DOMContentLoaded", async () => {
    // Fetch and update all data before calculating the total wallet balance
    await fetchCryptoPrices(); // Ensure prices are fetched first
    await updatePortfolioDisplay(); // Ensure portfolio is updated
    updateBalanceDisplay(); // Update MUSD balance display
    updateTotalCryptoValue(); // Calculate total crypto value
    updateTotalWalletBalance(); // Finally calculate and display the wallet balance

    // Load default chart (Bitcoin) on page load
    loadTradingViewChart(TRADINGVIEW_SYMBOLS["bitcoin"]);

    // Set intervals to refresh data every 10 seconds
    setInterval(async () => {
        await fetchCryptoPrices(); // Fetch updated prices
        await updatePortfolioDisplay(); // Update portfolio with latest prices
        updateTotalCryptoValue(); // Update total crypto value
        updateTotalWalletBalance(); // Update total wallet balance
    }, 10000);
});
const quests = [
    {
        id: 1,
        description: "Make your first purchase!",
        condition: (user) => user.firstPurchase, // Check if user made a purchase
        reward: 10, // Styx reward
        completed: false,
    },
    {
        id: 2,
        description: "Place a buy or sell order worth $10,000.",
        condition: (user) => user.tradeValue >= 10000, // Check if user made a trade >= $10,000
        reward: 20, // Styx reward
        completed: false,
    },
    {
        id: 3,
        description: "Achieve a total wallet value of $200,000.",
        condition: (user) => user.totalWalletValue >= 200000, // Check if wallet value >= $200,000
        reward: 50, // Styx reward
        completed: false,
    },
];
function renderQuests(user) {
    const questList = document.getElementById("quest-list");
    questList.innerHTML = ""; // Clear previous quests

    const activeQuests = quests.filter((quest) => !quest.completed);

    activeQuests.forEach((quest) => {
        const isCompleted = quest.condition(user);
        const questItem = document.createElement("li");
        questItem.className = "quest-item";

        questItem.innerHTML = `
            <span>${quest.description}</span>
            <button ${isCompleted ? "" : "disabled"} data-id="${quest.id}">
                ${isCompleted ? "Claim" : "Incomplete"}
            </button>
        `;

        questItem.querySelector("button").addEventListener("click", () => {
            claimQuestReward(quest.id, user);
        });

        questList.appendChild(questItem);
    });

    if (activeQuests.length === 0) {
        questList.innerHTML = `<p>All quests completed! 🎉</p>`;
    }
}


function claimQuestReward(questId, user) {
    const quest = quests.find((q) => q.id === questId);

    if (quest && !quest.completed && quest.condition(user)) {
        // Add reward to Styx balance
        styxBalance += quest.reward;
        saveStyxBalance();

        // Mark quest as completed
        quest.completed = true;

        // Update UI
        renderQuests(user);

        // Notify user
        alert(`Congratulations! You claimed ${quest.reward} Styx for completing: "${quest.description}"`);
        updateStyxBalanceDisplay(); // Update Styx balance in the UI
    }
}

const user = {
    firstPurchase: false,
    tradeValue: 0,
    totalWalletValue: 100000,
};

// Calculate the total wallet value: crypto + MUSD balance
function calculateTotalWalletValue() {
    let totalCryptoValue = 0;

    // Sum all crypto values in the portfolio
    for (const [crypto, details] of Object.entries(portfolio)) {
        totalCryptoValue += details.value || 0; // Use the pre-calculated values
    }

    // Return total wallet value
    return totalCryptoValue + balance; // Add MUSD balance
}


// Update user progress when they make a trade
function updateUserProgress(type, value) {
    if (!user.firstPurchase && type === "buy") {
        user.firstPurchase = true; // Mark first purchase complete
    }

    user.tradeValue += value; // Increment total trade value

    // Update wallet value dynamically
    user.totalWalletValue = calculateTotalWalletValue();

    // Re-render quests
    renderQuests(user);
}
document.addEventListener("DOMContentLoaded", () => {
    renderQuests(user);

    // Example: Update user progress after making a purchase
    document.getElementById("buy-button").addEventListener("click", () => {
        const tradeAmount = parseFloat(document.getElementById("trade-amount").value);
        updateUserProgress("buy", tradeAmount);
    });

    document.getElementById("sell-button").addEventListener("click", () => {
        const tradeAmount = parseFloat(document.getElementById("trade-amount").value);
        updateUserProgress("sell", tradeAmount);
    });
});
