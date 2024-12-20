
// Initial Token and Wallet Data
const tokens = {
  CONE: { usdLiquidity: 1000, tokenLiquidity: 1000000, maxSupply: 1200000 },
  MEGA: { usdLiquidity: 1000, tokenLiquidity: 3000000, maxSupply: 3500000 },
  ALPH: { usdLiquidity: 1000, tokenLiquidity: 4500000, maxSupply: 5000000 },
  BETA: { usdLiquidity: 1000, tokenLiquidity: 7000000, maxSupply: 7500000 },
  ZETA: { usdLiquidity: 1000, tokenLiquidity: 10000000, maxSupply: 12000000 },
};

  
  let wallet = {
    USD: 1000,
    CONE: 0,
    MEGA: 0,
    ALPH: 0,
    BETA: 0,
    ZETA: 0,
  };
  
  function showPage(pageId) {
    document.querySelectorAll('[id$="-page"]').forEach((page) => {
      page.classList.add('hidden'); // Hide all pages
    });
  
    const selectedPage = document.getElementById(`${pageId}-page`);
    if (selectedPage) {
      selectedPage.classList.remove('hidden'); // Show the selected page
    } else {
      console.error(`Page ${pageId}-page not found!`);
    }
  }
  

  
  
  
  // Store the hourly prices for each token
const hourlyPrices = {};

// Initialize the hourly prices with the current prices
function initializeHourlyPrices() {
  for (const token in tokens) {
    const price = tokens[token].usdLiquidity / tokens[token].tokenLiquidity;
    hourlyPrices[token] = price;
  }
}

// Call this function at the start of the application
initializeHourlyPrices();

function updateHourlyPrices() {
  for (const token in tokens) {
    const price = tokens[token].usdLiquidity / tokens[token].tokenLiquidity;
    hourlyPrices[token] = price;
  }
  console.log('Hourly prices updated:', hourlyPrices);
}

// Schedule the hourly update
setInterval(updateHourlyPrices, 60 * 60 * 1000); // Update every hour

  
  
  
  
  // Update Wallet Balances and Prices
  function updateWallet() {
    // Update USD balance
    document.getElementById('usd-balance').innerText = wallet.USD.toFixed(2);

    // Update token balances
    const balancesDiv = document.getElementById('token-balances');
    balancesDiv.innerHTML = '';
    for (const token in wallet) {
        if (token !== 'USD') {
            const balance = wallet[token].toFixed(2);
            balancesDiv.innerHTML += `<div>${token}: ${balance}</div>`;
        }
    }

    // Update total wallet value
    const totalValue = calculateTotalWalletValue();
    document.getElementById('total-wallet-value').innerText = totalValue;
}

  
  // Calculate and Display Token Prices
  function updatePrices() {
    const pricesDiv = document.getElementById('token-prices');
    pricesDiv.innerHTML = '';
  
    for (const token in tokens) {
      const price = tokens[token].usdLiquidity / tokens[token].tokenLiquidity;
      pricesDiv.innerHTML += `<div>${token}: $${price.toFixed(4)} per token</div>`;
    }
  }
  
// Trade fee rate (e.g., 0.3%)
const tradeFeeRate = 0.003;

// Default slippage tolerance (e.g., 1% or 0.01)
let slippageTolerance = 0.01;

// Function to set slippage tolerance
function setSlippageTolerance(value) {
    if (value >= 0.1 && value <= 10) {
        slippageTolerance = value / 100; // Convert percentage to decimal
        alert(`Slippage tolerance set to ${value}%`);
    } else {
        alert('Please enter a valid slippage tolerance between 0.1% and 10%.');
        document.getElementById('slippage-tolerance').value = 1; // Reset to default
        slippageTolerance = 0.01;
    }
}


function updateSlippageTolerance(event) {
  const value = parseFloat(event?.target?.value || 0); // Safely access event and its value
  if (isNaN(value)) {
      alert('Invalid slippage tolerance. Please enter a valid number.');
      return;
  }
  setSlippageTolerance(value); // Use your existing function
}



// Swap Tokens
function swapTokens() {
  const from = document.getElementById('swap-from').value;
  const to = document.getElementById('swap-to').value;
  const amount = parseFloat(document.getElementById('swap-amount').value);

  if (!amount || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
  }

  if (from === to) {
      alert('Please select different tokens.');
      return;
  }

  if (!tokens[from] && from !== 'USD') {
      alert(`Token ${from} is not available.`);
      return;
  }

  if (!tokens[to] && to !== 'USD') {
      alert(`Token ${to} is not available.`);
      return;
  }

  let tokensBought = 0;
  let usdReceived = 0;

  const fee = amount * tradeFeeRate; // Calculate trade fee
  const effectiveAmount = amount - fee; // Deduct fee from trade amount

  if (from === 'USD') {
      if (wallet.USD < amount) {
          alert('Not enough USD!');
          return;
      }

      const initialPrice = tokens[to].usdLiquidity / tokens[to].tokenLiquidity;
      tokensBought = effectiveAmount / initialPrice;

      const newUsdLiquidity = tokens[to].usdLiquidity + effectiveAmount;
      const newTokenLiquidity = tokens[to].tokenLiquidity - tokensBought;
      const newPrice = newUsdLiquidity / newTokenLiquidity;

      const priceImpact = Math.abs(newPrice - initialPrice) / initialPrice;
      console.log(`Initial Price: ${initialPrice}, New Price: ${newPrice}, Price Impact: ${(priceImpact * 100).toFixed(2)}%`);

      if (priceImpact > slippageTolerance) {
          alert(`Transaction failed: price impact (${(priceImpact * 100).toFixed(2)}%) exceeds slippage tolerance.`);
          return;
      }

      if (tokens[to].tokenLiquidity < tokensBought) {
          alert('Not enough liquidity in the pool!');
          return;
      }

      wallet.USD -= amount;
      wallet[to] = (wallet[to] || 0) + tokensBought;
      tokens[to].usdLiquidity += effectiveAmount;
      tokens[to].tokenLiquidity -= tokensBought;

      tokens[to].usdLiquidity += fee;

      logTransaction(from, to, amount, tokensBought);
  } else if (to === 'USD') {
      if (wallet[from] < amount) {
          alert('Not enough tokens!');
          return;
      }

      const initialPrice = tokens[from].usdLiquidity / tokens[from].tokenLiquidity;
      usdReceived = effectiveAmount * initialPrice;

      const newUsdLiquidity = tokens[from].usdLiquidity - usdReceived;
      const newTokenLiquidity = tokens[from].tokenLiquidity + effectiveAmount;
      const newPrice = newUsdLiquidity / newTokenLiquidity;

      const priceImpact = Math.abs(newPrice - initialPrice) / initialPrice;
      console.log(`Initial Price: ${initialPrice}, New Price: ${newPrice}, Price Impact: ${(priceImpact * 100).toFixed(2)}%`);

      if (priceImpact > slippageTolerance) {
          alert(`Transaction failed: price impact (${(priceImpact * 100).toFixed(2)}%) exceeds slippage tolerance.`);
          return;
      }

      if (tokens[from].usdLiquidity < usdReceived) {
          alert('Not enough USD liquidity in the pool!');
          return;
      }

      wallet[from] -= amount;
      wallet.USD += usdReceived;
      tokens[from].usdLiquidity -= usdReceived;
      tokens[from].tokenLiquidity += effectiveAmount;

      tokens[from].usdLiquidity += fee;

      logTransaction(from, to, amount, usdReceived);
  }

  // Update UI
  updateWallet();
  updateHistory();
  updateLiquidityInfo();
  updatePrices();
  updateMarketFeed();
  replenishLiquidity();
  alert(`Successfully swapped ${amount} ${from} for ${tokensBought || usdReceived} ${to}!`);
}



  
function setSwapPercentage(percentage) {
  const fromToken = document.getElementById('swap-from').value;
  const amountField = document.getElementById('swap-amount');

  if (fromToken === 'USD') {
    // USD to Token Swap
    const usdBalance = wallet.USD || 0; // Get the user's USD balance
    const amount = (usdBalance * percentage) / 100; // Calculate the percentage
    amountField.value = amount.toFixed(2); // Set the calculated amount
  } else {
    // Token to USD Swap
    const tokenBalance = wallet[fromToken] || 0; // Get the user's token balance
    const amount = (tokenBalance * percentage) / 100; // Calculate the percentage
    amountField.value = amount.toFixed(4); // Set the calculated amount
  }

  updateSwapPrice(); // Update the swap price display
}


  
  // Update Swap Price Display
  function updateSwapPrice() {
    const from = document.getElementById('swap-from').value;
    const to = document.getElementById('swap-to').value;
    const amount = parseFloat(document.getElementById('swap-amount').value) || 0;
    const priceDisplay = document.getElementById('swap-price-display');
  
    if (from === to) {
      priceDisplay.innerText = 'Please select different tokens.';
      return;
    }
  
    if (from === 'USD') {
      const price = tokens[to].usdLiquidity / tokens[to].tokenLiquidity;
      const estimatedTokens = amount / price;
      priceDisplay.innerText = `Estimated: ${estimatedTokens.toFixed(4)} ${to}`;
    } else if (to === 'USD') {
      const price = tokens[from].usdLiquidity / tokens[from].tokenLiquidity;
      const estimatedUSD = amount * price;
      priceDisplay.innerText = `Estimated: $${estimatedUSD.toFixed(2)} USD`;
    } else {
      const priceFrom = tokens[from].usdLiquidity / tokens[from].tokenLiquidity;
      const priceTo = tokens[to].usdLiquidity / tokens[to].tokenLiquidity;
      const estimatedTokens = (amount * priceFrom) / priceTo;
      priceDisplay.innerText = `Estimated: ${estimatedTokens.toFixed(4)} ${to}`;
    }
  }
  
  let transactions = [];


  
/**
 * Logs a transaction and updates the history.
 */
function logTransaction(from, to, amount, received) {
  const transaction = {
    date: new Date().toLocaleString(),
    from,
    to,
    amount: amount.toFixed(4),
    received: received.toFixed(4),
  };

  // Add the transaction to the array
  transactions.push(transaction);

  console.log('Transaction Logged:', transaction); // Debugging

  // Update the history display
  updateHistory();
}

/**
 * Updates the transaction history section based on filters.
 */
let currentPage = 1; // Tracks the current page
const itemsPerPage = 10; // Number of transactions per page

function updateHistory() {
    const transactionTableBody = document.querySelector('.transaction-table tbody');
    const paginationControls = document.getElementById('pagination-controls');

    transactionTableBody.innerHTML = ''; // Clear previous content
    paginationControls.innerHTML = ''; // Clear pagination controls

    // Reverse transactions to show latest first
    const reversedTransactions = [...transactions].reverse();

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const filteredTransactions = reversedTransactions.slice(startIndex, endIndex); // Transactions for the current page

    if (filteredTransactions.length === 0) {
        transactionTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center;">No transactions available.</td>
            </tr>
        `;
        return;
    }

    // Render current page transactions
    filteredTransactions.forEach((tx) => {
        const row = `
            <tr>
                <td>${tx.date}</td>
                <td>${tx.from}</td>
                <td>${tx.to}</td>
                <td>${tx.amount}</td>
                <td>${tx.received}</td>
            </tr>
        `;
        transactionTableBody.innerHTML += row;
    });

    // Create pagination controls
    const totalPages = Math.ceil(reversedTransactions.length / itemsPerPage);

    // Previous Button
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.onclick = () => {
            currentPage--;
            updateHistory();
        };
        paginationControls.appendChild(prevButton);
    }

    // Page Numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.disabled = i === currentPage; // Disable the current page button
        pageButton.onclick = () => {
            currentPage = i;
            updateHistory();
        };
        paginationControls.appendChild(pageButton);
    }

    // Next Button
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.onclick = () => {
            currentPage++;
            updateHistory();
        };
        paginationControls.appendChild(nextButton);
    }
}


  
  
  
  



  
  
  
  
  
  let staking = {
    CONE: 0,
    MEGA: 0,
    ALPH: 0,
    BETA: 0,
    ZETA: 0,
  };
  
  let rewards = {
    CONE: 0,
    MEGA: 0,
    ALPH: 0,
    BETA: 0,
    ZETA: 0,
  };
  
  // Stake Tokens
  function stakeTokens() {
    const token = document.getElementById('stake-token').value;
    const amount = parseFloat(document.getElementById('stake-amount').value);
  
    if (!amount || amount <= 0 || wallet[token] < amount) {
      alert('Invalid amount or insufficient balance.');
      return;
    }
  
    wallet[token] -= amount;
    staking[token] += amount;
  
    logTransaction('Wallet', `Staking (${token})`, amount, 0);

    updatePrices();
    updateMarketFeed();
    updateWallet();
    updateStakingRewards();
  }
  
  
  // Distribute Rewards Periodically
  function distributeRewards() {
    for (const token in staking) {
      rewards[token] += staking[token] * 0.001; // Earn 0.1% reward per distribution cycle
    }
    updateStakingRewards();
  }
  
  // Update Staking Rewards Display
  function updateStakingRewards() {
    const rewardsDiv = document.getElementById('staking-rewards');
    rewardsDiv.innerHTML = '';
    for (const token in rewards) {
      if (rewards[token] > 0) {
        rewardsDiv.innerHTML += `<p>${token}: ${rewards[token].toFixed(4)} reward available</p>`;
      }
    }
  }
  
  // Claim Rewards
  function claimRewards() {
    let rewardsClaimed = false;
  
    for (const token in rewards) {
      if (rewards[token] > 0) {
        const rewardAmount = rewards[token];
  
        // Add the reward to the user's wallet
        wallet[token] += rewardAmount;
  
        // Log the transaction for claimed rewards
        logTransaction(`Rewards (${token})`, 'Wallet', rewardAmount, 0);
  
        // Reset the rewards to zero
        rewards[token] = 0;
  
        rewardsClaimed = true;
      }
    }
  
    if (rewardsClaimed) {
      alert('Rewards claimed successfully!');
    } else {
      alert('No rewards available to claim.');
    }
  
    // Update the wallet, staking rewards, and other components
    updateWallet();
    updateStakingRewards();
    updatePrices();
    updateMarketFeed();
  }
  
  
  // Start periodic reward distribution
  setInterval(distributeRewards, 5000); // Distribute rewards every 5 seconds
  
  let walletChart = null;
  function renderWalletChart() {
    const ctx = document.getElementById('wallet-chart').getContext('2d');
  
    // Destroy the existing chart instance if it exists
    if (walletChart !== null) {
      walletChart.destroy();
    }
  
    const tokenLabels = Object.keys(wallet).filter((key) => wallet[key] > 0);
    const tokenBalances = Object.values(wallet).filter((value) => value > 0);
  
    if (tokenLabels.length === 0) {
      console.log('No tokens with non-zero balances to display in the chart.');
      return;
    }
  
    const data = {
      labels: tokenLabels,
      datasets: [
        {
          label: 'Token Balances',
          data: tokenBalances,
          backgroundColor: ['#007bff', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
        },
      ],
    };
  
    // Create a new chart instance
    walletChart = new Chart(ctx, {
      type: 'pie',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
          },
        },
      },
    });
  }
  
  
  // Modify updateWallet to ensure it updates the chart correctly
  updateWallet = (function (originalUpdateWallet) {
    return function () {
      originalUpdateWallet();
      renderWalletChart();
    };
  })(updateWallet);
  
  let lendingPool = {
    CONE: 0,
    MEGA: 0,
    ALPH: 0,
    BETA: 0,
    ZETA: 0,
  };
  
  function lendTokens() {
    const token = document.getElementById('lend-token').value;
    const amount = parseFloat(document.getElementById('lend-amount').value);
  
    if (!amount || amount <= 0 || wallet[token] < amount) {
      alert('Invalid amount or insufficient balance.');
      return;
    }
  
    wallet[token] -= amount;
    lendingPool[token] += amount;
  
    updateWallet();
    alert(`Successfully lent ${amount} ${token}.`);
  }
  
  let borrowed = {
    CONE: 0,
    MEGA: 0,
    ALPH: 0,
    BETA: 0,
    ZETA: 0,
  };
  
  function borrowTokens() {
    const token = document.getElementById('borrow-token').value;
    const amount = parseFloat(document.getElementById('borrow-amount').value);
  
    if (!amount || amount <= 0 || lendingPool[token] < amount) {
      alert('Invalid amount or insufficient tokens in the pool.');
      return;
    }
  
    borrowed[token] += amount;
    lendingPool[token] -= amount;
  
    updateWallet();
    alert(`Successfully borrowed ${amount} ${token}.`);
  }
  
  function fluctuatePrices() {
    for (const token in tokens) {
      const randomFactor = (Math.random() - 0.5) * 0.15; // Fluctuate by ±7.5% (0.15/2 = 7.5%)
      tokens[token].usdLiquidity *= 1 + randomFactor;
      tokens[token].tokenLiquidity *= 1 - randomFactor; // Adjust token supply inversely
    }
  
    updatePrices(); // Refresh displayed prices
  }
  
  // Start price fluctuations every 10 seconds
  setInterval(fluctuatePrices, 10000);
  
  const previousPrices = {}; // Store the previous prices for each token
  

// Initialize Market Feed with Starting Prices
function initializeMarketFeed() {
  for (const token in tokens) {
    const initialPrice = tokens[token].usdLiquidity / tokens[token].tokenLiquidity;
    previousPrices[token] = initialPrice; // Store the initial price
  }
  updateMarketFeed();
}

// Update Market Feed Dynamically
function updateMarketFeed() {
  const feedDiv = document.getElementById('feed-updates');
  feedDiv.innerHTML = ''; // Clear the existing feed

  for (const token in tokens) {
    const currentPrice = tokens[token].usdLiquidity / tokens[token].tokenLiquidity;
    const hourlyPrice = hourlyPrices[token] || currentPrice; // Default to current price if no hourly price exists
    const changePercent = ((currentPrice - hourlyPrice) / hourlyPrice) * 100;

    // Add token info with price and % change
    feedDiv.innerHTML += `
      <div class="market-feed-item">
        <p>
          <strong>${token}</strong> $${currentPrice.toFixed(10)}
          <span class="percent-change ${changePercent >= 0 ? 'positive' : 'negative'}">
            ${changePercent.toFixed(2)}%
          </span>
        </p>
      </div>
    `;
  }
}




// Schedule updates every 10 seconds
setInterval(updateMarketFeed, updateSwapDropdowns, 10000);

// Initialize the market feed on page load
initializeMarketFeed();

  
  
  function unstakeTokens() {
    const token = document.getElementById('unstake-token').value;
    const amount = parseFloat(document.getElementById('unstake-amount').value);
  
    if (!amount || amount <= 0 || staking[token] < amount) {
      alert('Invalid amount or insufficient staked tokens.');
      return;
    }
  
    staking[token] -= amount;
    wallet[token] += amount;
  
    logTransaction(`Staking (${token})`, 'Wallet', amount, 0);

  
    updateWallet();
    updateStakingRewards();
    updateLiquidityInfo();
    updatePrices();
    updateMarketFeed();

  }
  
  
  function updateStakingDashboard() {
    const statsDiv = document.getElementById('staking-stats');
    statsDiv.innerHTML = '';
  
    let hasStakes = false;
    for (const token in staking) {
      if (staking[token] > 0) {
        hasStakes = true;
        statsDiv.innerHTML += `
          <div>
            <p><strong>${token}</strong></p>
            <p>Staked: ${staking[token].toFixed(4)}</p>
            <p>Pending Rewards: ${rewards[token].toFixed(4)}</p>
          </div>`;
      }
    }
  
    if (!hasStakes) {
      statsDiv.innerHTML = '<p>No tokens staked yet.</p>';
    }
  }
  
  // Ensure dashboard updates whenever staking or rewards change
  updateStakingRewards = (function (originalUpdateStakingRewards) {
    return function () {
      originalUpdateStakingRewards();
      updateStakingDashboard();
    };
  })(updateStakingRewards);
  
  updateStakingDashboard();
  
  let proposals = {
    1: { description: 'Increase Rewards', votes: 0 },
    2: { description: 'Add New Token', votes: 0 },
    3: { description: 'Reduce Fees', votes: 0 },
  };
  
  function voteOnProposal() {
    const proposalId = document.getElementById('proposal-vote').value;
    let totalStaked = 0;
  
    for (const token in staking) {
      totalStaked += staking[token];
    }
  
    if (totalStaked === 0) {
      alert('You must have staked tokens to vote.');
      return;
    }
  
    proposals[proposalId].votes += totalStaked;
  
    alert(`Successfully voted on "${proposals[proposalId].description}".`);
  }
  /**
 * Updates the liquidity information displayed in the liquidity info section.
 */

// Add Liquidity Function
function addLiquidity(token, amount) {
  if (!tokens[token]) {
      console.error(`Token ${token} does not exist.`);
      return;
  }

  const tokenData = tokens[token];

  // Check if adding liquidity exceeds the max supply
  if (tokenData.tokenLiquidity + amount > tokenData.maxSupply) {
      alert(`Cannot add ${amount} ${token}. Max supply of ${tokenData.maxSupply} exceeded.`);
      return;
  }

  // Add liquidity to the token
  tokenData.tokenLiquidity += amount;
  tokenData.usdLiquidity += amount * (tokenData.usdLiquidity / tokenData.tokenLiquidity);

  console.log(`Added ${amount} ${token}. New liquidity: ${tokenData.tokenLiquidity}`);
  updateLiquidityInfo(); // Update the displayed liquidity information
}

function replenishLiquidity() {
  console.log('Replenishing liquidity...');
  for (const token in tokens) {
    const tokenData = tokens[token];

    // Replenish USD liquidity if it drops to zero
    if (tokenData.usdLiquidity <= 0) {
      console.warn(`Replenishing USD liquidity for ${token}`);
      tokenData.usdLiquidity += 1000; // Add fixed USD liquidity
    }

    // Replenish token liquidity up to the original max supply if necessary
    if (tokenData.tokenLiquidity < tokenData.maxSupply) {
      console.warn(`Replenishing token liquidity for ${token}`);
      const neededTokens = tokenData.maxSupply - tokenData.tokenLiquidity;
      tokenData.tokenLiquidity += Math.min(1000, neededTokens); // Add up to 1000 tokens, but not exceed maxSupply
    }
  }
  updateLiquidityInfo(); // Refresh displayed liquidity
}


// Update Liquidity Info Display
function updateLiquidityInfo() {
  const liquidityDetails = document.getElementById('liquidity-details');
  if (!liquidityDetails) {
      console.error('Liquidity details container not found.');
      return;
  }

  liquidityDetails.innerHTML = ''; // Clear existing details

  for (const token in tokens) {
      const tokenData = tokens[token];
      liquidityDetails.innerHTML += `
          <div class="liquidity-item">
              <p><strong>${token}:</strong></p>
              <p>Liquidity: ${tokenData.usdLiquidity.toFixed(2)} USD / ${tokenData.tokenLiquidity.toFixed(2)} ${token}</p>
          </div>
      `;
  }
}

// Automatically replenish liquidity every 10 seconds
setInterval(() => {
  replenishLiquidity();
}, 10000);


  // Function to calculate and update total wallet value
function calculateTotalWalletValue() {
  const totalWalletValueElement = document.getElementById('total-wallet-value');
  let totalValue = wallet.USD; // Start with USD balance

  // Calculate the value of each token in USD
  for (const token in wallet) {
      if (token !== 'USD' && tokens[token]) {
          const pricePerToken = tokens[token].usdLiquidity / tokens[token].tokenLiquidity;
          totalValue += wallet[token] * pricePerToken; // Add token value in USD
      }
  }

  // Update the total wallet value in the UI
  totalWalletValueElement.textContent = totalValue.toFixed(2);
}

// Initial call to calculate the total wallet value
calculateTotalWalletValue();

// Set up periodic updates every 5 seconds
setInterval(calculateTotalWalletValue, 5000);

function createMockToken() { 
  const tokenName = document.getElementById('token-name').value.trim();
  const tokenSymbol = document.getElementById('token-symbol').value.trim();
  const maxSupply = parseInt(document.getElementById('max-supply').value);

  if (!tokenName || !tokenSymbol || isNaN(maxSupply) || maxSupply <= 0) {
      alert('Please enter valid token details.');
      return;
  }

  if (tokens[tokenSymbol]) {
      alert('A token with this symbol already exists.');
      return;
  }

  // Add the token to the tokens object
  const initialLiquidity = 1000;
  const initialTokenSupply = maxSupply - (maxSupply * 0.1); // Deduct 10% for user's balance
  tokens[tokenSymbol] = {
      usdLiquidity: initialLiquidity,
      tokenLiquidity: initialTokenSupply,
      maxSupply: maxSupply,
  };

  // Initialize the hourly price for the new token
  hourlyPrices[tokenSymbol] = initialLiquidity / initialTokenSupply;

  // Add the token to the user's wallet
  wallet[tokenSymbol] = maxSupply * 0.1; // User gets 10% of the supply

  // Update swap dropdowns
  updateSwapDropdowns();

  // Update other sections dynamically
  updateWallet();
  updateMarketFeed();
  updateLiquidityInfo();

  alert(`${tokenName} (${tokenSymbol}) has been created successfully!`);
}



function updateSwapDropdowns() {
  const swapFrom = document.getElementById('swap-from');
  const swapTo = document.getElementById('swap-to');

  // Clear existing options
  swapFrom.innerHTML = '<option value="USD">USD</option>';
  swapTo.innerHTML = '<option value="USD">USD</option>';

  // Add tokens dynamically
  for (const token in tokens) {
    const optionFrom = document.createElement('option');
    optionFrom.value = token;
    optionFrom.textContent = token;

    const optionTo = document.createElement('option');
    optionTo.value = token;
    optionTo.textContent = token;

    swapFrom.appendChild(optionFrom);
    swapTo.appendChild(optionTo);
  }
}

function updateTokenPreview() {
  const maxSupplyInput = document.getElementById('max-supply').value;
  const maxSupply = parseFloat(maxSupplyInput) || 0; // Convert input to a number or default to 0
  const initialLiquidity = 1000; // Fixed initial liquidity in USD

  // Calculate the initial price per token
  const pricePerToken = maxSupply > 0 ? initialLiquidity / maxSupply : 0;

  // Update the preview values in the UI
  document.getElementById('preview-total-tokens').innerText = maxSupply.toLocaleString();
  
  // Show price with up to 18 decimals, but remove trailing zeros
  document.getElementById('preview-price').innerText = pricePerToken.toFixed(10).replace(/\.?0+$/, '');
}



// Initialize the application
updateWallet();
renderWalletChart();
updateMarketFeed();
updateLiquidityInfo(); // Ensure liquidity info is shown on page load

