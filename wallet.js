let masterSeedPhrase = null; // Single seed phrase
let ethWallet = null; // Ethereum wallet
let bnbWallet = null; // Binance Smart Chain wallet


// Ethereum and Binance Smart Chain providers
const ethProvider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth"); // Ethereum Mainnet
const bnbMainnetProvider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/bsc"); // Binance Smart Chain Mainnet
const bnbTestnetProvider = new ethers.providers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545/"); // Binance Smart Chain Testnet


function getProvider(token) {
    if (token.bscAddressTestnet) {
        return bnbTestnetProvider; // Use testnet for Styxora
    } else if (token.bscAddress) {
        return bnbMainnetProvider; // Use mainnet for other tokens
    } else if (token.ethereumAddress) {
        return ethProvider; // Use Ethereum provider
    }
    throw new Error("No provider available for this token.");
}


// Supported tokens (ERC-20 and BEP-20)
const tokens = [
    
    {
        name: "Styxora",
        symbol: "STYX",
        decimals: 18,
        bscAddress: null, // For mainnet (if applicable)
        bscAddressTestnet: "0x39C3492a6fFBDDe972eC984985f0CD6dceAb7eb2", // Testnet address
    }
    ,
    
];


const tokenAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
];




document.addEventListener("DOMContentLoaded", () => {
    const generateWalletBtn = document.getElementById("generate-wallet-btn");
    const restoreWalletBtn = document.getElementById("open-restore-btn");
    const confirmSeedBtn = document.getElementById("confirm-seed-btn");
    const restoreWalletSubmitBtn = document.getElementById("restore-wallet-submit-btn");
    const logoutBtn = document.getElementById("logout-btn");

    generateWalletBtn.addEventListener("click", generateWallet);
    restoreWalletBtn.addEventListener("click", showRestoreWalletSection);
    confirmSeedBtn.addEventListener("click", confirmSeedPhrase);
    restoreWalletSubmitBtn.addEventListener("click", restoreWallet);
    logoutBtn.addEventListener("click", logoutWallet);

    const storedSeed = localStorage.getItem("masterSeedPhrase");
    if (storedSeed) {
        masterSeedPhrase = storedSeed;
        generateWalletsFromSeed(masterSeedPhrase);
    } else {
        showWalletSetupOptions();
    }
});

// Show the restore wallet section
function showRestoreWalletSection() {
    document.getElementById("wallet-setup-options").style.display = "none";
    document.getElementById("restore-wallet-section").style.display = "block";
}

// Restore wallet using seed phrase
function restoreWallet() {
    const userSeedPhrase = document.getElementById("restore-seed-phrase").value.trim();

    if (!userSeedPhrase || !ethers.utils.isValidMnemonic(userSeedPhrase)) {
        alert("Invalid seed phrase. Please try again.");
        return;
    }

    masterSeedPhrase = userSeedPhrase;
    localStorage.setItem("masterSeedPhrase", masterSeedPhrase);
    generateWalletsFromSeed(masterSeedPhrase);

    document.getElementById("restore-wallet-section").style.display = "none";
    document.getElementById("wallet-details").style.display = "block";
}


// Generate a single seed phrase and derive wallets
function generateWallet() {
    masterSeedPhrase = ethers.utils.entropyToMnemonic(ethers.utils.randomBytes(16));
    document.getElementById("seed-section").style.display = "block";
    document.getElementById("seed-phrase").textContent = masterSeedPhrase;
    alert("Save your seed phrase securely. It will not be shown again.");
}

// Confirm seed phrase and generate wallets
function confirmSeedPhrase() {
    if (!masterSeedPhrase) {
        alert("No seed phrase generated!");
        return;
    }

    localStorage.setItem("masterSeedPhrase", masterSeedPhrase);
    generateWalletsFromSeed(masterSeedPhrase);
    document.getElementById("seed-section").style.display = "none";
}

// Restore wallet using seed phrase entered in the text box
function restoreWallet() {
    const userSeedPhrase = document.getElementById("restore-seed-phrase").value.trim();

    if (!userSeedPhrase || !ethers.utils.isValidMnemonic(userSeedPhrase)) {
        alert("Invalid seed phrase. Please try again.");
        return;
    }

    masterSeedPhrase = userSeedPhrase;
    localStorage.setItem("masterSeedPhrase", masterSeedPhrase);
    generateWalletsFromSeed(masterSeedPhrase);
}

// Derive Ethereum and Binance Smart Chain wallets from seed phrase
function generateWalletsFromSeed(seed) {
    const hdNode = ethers.utils.HDNode.fromMnemonic(seed);

    const ethPrivateKey = hdNode.derivePath("m/44'/60'/0'/0/0").privateKey;
    const bnbPrivateKey = hdNode.derivePath("m/44'/60'/0'/0/1").privateKey;

    ethWallet = new ethers.Wallet(ethPrivateKey, ethProvider); // Ethereum wallet
    bnbWallet = new ethers.Wallet(bnbPrivateKey, bnbMainnetProvider); // Binance wallet

    document.getElementById("eth-wallet-address").textContent = ethWallet.address;
    document.getElementById("bnb-wallet-address").textContent = bnbWallet.address;

    displayWalletDetails();
}


let balanceInterval; // Global variable for interval

// Display wallet details and start periodic updates
async function displayWalletDetails() {
    document.getElementById("wallet-details").style.display = "block";
    document.getElementById("withdraw-section").style.display = "block";
    document.getElementById("wallet-setup-options").style.display = "none"; // Hide setup options
    document.getElementById("restore-wallet-section").style.display = "none"; // Hide restore wallet section
    document.getElementById("logout-btn").style.display = "block"; // Show logout button

    await updateBalances(); // Fetch initial balances

    // Clear any existing interval to avoid multiple loops
    clearInterval(balanceInterval);

    // Start periodic balance updates
    balanceInterval = setInterval(async () => {
        console.log("Refreshing balances...");
        await updateBalances();
    }, 10000); // Refresh every 10 seconds
}

// Stop periodic updates when logging out
function logoutWallet() {
    masterSeedPhrase = null;
    ethWallet = null;
    bnbWallet = null;

    localStorage.removeItem("masterSeedPhrase");

    // Clear wallet details
    document.getElementById("eth-wallet-address").textContent = "";
    document.getElementById("bnb-wallet-address").textContent = "";
    document.getElementById("eth-balance").textContent = "0.0";
    document.getElementById("bnb-balance").textContent = "0.0";
    document.getElementById("token-balances").innerHTML = "";

    // Hide wallet details and show setup options
    document.getElementById("wallet-details").style.display = "none";
    document.getElementById("withdraw-section").style.display = "none";
    document.getElementById("logout-btn").style.display = "none"; // Hide logout button
    showWalletSetupOptions();

    // Stop periodic updates
    clearInterval(balanceInterval);
}




// Update native and token balances
let previousBalances = {}; // Track previous balances

// Update native and token balances
async function updateBalances() {
    try {
        const ethBalance = await ethProvider.getBalance(ethWallet.address);
        const bnbBalance = await bnbMainnetProvider.getBalance(bnbWallet.address);

        document.getElementById("eth-balance").textContent = ethers.utils.formatEther(ethBalance);
        document.getElementById("bnb-balance").textContent = ethers.utils.formatEther(bnbBalance);

        await updateTokenBalances();
    } catch (error) {
        console.error("Error updating balances:", error);
    }
}

async function updateTokenBalances() {
    const tokenBalances = document.getElementById("token-balances");

    // Cache existing balances
    const cachedBalances = {};

    for (const token of tokens) {
        try {
            const provider = getProvider(token);
            const contractAddress = token.bscAddressTestnet || token.bscAddress || token.ethereumAddress;
            if (!contractAddress) continue;

            const contract = new ethers.Contract(contractAddress, tokenAbi, provider);
            const balance = await contract.balanceOf(bnbWallet.address);

            if (cachedBalances[token.name] !== balance) {
                cachedBalances[token.name] = balance;
                const networkType = token.bscAddressTestnet ? "(Testnet)" : "(Mainnet)";
                tokenBalances.innerHTML += `
                    <li><strong>${token.name} ${networkType}:</strong> ${ethers.utils.formatUnits(balance, token.decimals)}</li>
                `;
            }
        } catch (error) {
            console.error(`Error fetching balance for token ${token.name}:`, error.message);
        }
    }
}


// Update token balances for both networks
async function updateTokenBalances() {
    const tokenBalances = document.getElementById("token-balances");
    const withdrawDropdown = document.getElementById("withdraw-coin");

    // Preserve the selected token
    const previousSelection = withdrawDropdown.value;

    tokenBalances.innerHTML = ""; // Clear previous balances
    withdrawDropdown.innerHTML = `
        <option value="eth">Ethereum (ETH)</option>
        <option value="bnb">Binance Coin (BNB)</option>
    `; // Add native coins

    for (const token of tokens) {
        try {
            const provider = getProvider(token);
            const contractAddress = token.bscAddressTestnet || token.bscAddress || token.ethereumAddress;
            if (!contractAddress) continue;

            const contract = new ethers.Contract(contractAddress, tokenAbi, provider);
            const balance = await contract.balanceOf(bnbWallet.address);

            const networkType = token.bscAddressTestnet ? "(Testnet)" : "(Mainnet)";
            tokenBalances.innerHTML += `
                <li><strong>${token.name} ${networkType}:</strong> ${ethers.utils.formatUnits(balance, token.decimals)}</li>
            `;

            const dropdownValue = token.bscAddressTestnet
                ? `bep20-testnet-${token.name}`
                : token.bscAddress
                ? `bep20-${token.name}`
                : `erc20-${token.name}`;
            withdrawDropdown.innerHTML += `
                <option value="${dropdownValue}">${token.name} ${networkType}</option>
            `;
        } catch (error) {
            console.error(`Error fetching balance for token ${token.name}:`, error.message);
        }
    }

    // Restore the previous selection
    if (previousSelection) {
        withdrawDropdown.value = previousSelection;
    }
}






// Handle withdrawals for tokens and native coins
async function handleWithdraw(event) {
    event.preventDefault();

    const selectedOption = document.getElementById("withdraw-coin").value;
    const recipient = document.getElementById("withdraw-address").value.trim();
    const amount = document.getElementById("withdraw-amount").value.trim();

    if (!recipient || !ethers.utils.isAddress(recipient)) {
        alert("Invalid recipient address.");
        return;
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        alert("Invalid withdrawal amount.");
        return;
    }

    try {
        if (selectedOption.startsWith("erc20-") || selectedOption.startsWith("bep20-")) {
            const tokenName = selectedOption.split("-")[1];
            const token = tokens.find((t) => t.name === tokenName);
            const isTestnet = selectedOption.includes("testnet");

            const provider = isTestnet ? bnbTestnetProvider : getProvider(token);
            const wallet = isTestnet ? bnbWallet : ethWallet;
            const contractAddress = isTestnet ? token.bscAddressTestnet : token.bscAddress || token.ethereumAddress;

            const contract = new ethers.Contract(contractAddress, tokenAbi, wallet.connect(provider));
            const tx = await contract.transfer(recipient, ethers.utils.parseUnits(amount, token.decimals));
            alert(`Token transaction sent! Hash: ${tx.hash}`);
        } else {
            const isEth = selectedOption === "eth";
            const wallet = isEth ? ethWallet.connect(ethProvider) : bnbWallet.connect(bnbMainnetProvider);

            const tx = await wallet.sendTransaction({
                to: recipient,
                value: ethers.utils.parseEther(amount),
            });

            alert(`Native transaction sent! Hash: ${tx.hash}`);
        }
    } catch (error) {
        console.error("Error during withdrawal:", error);
        alert("Transaction failed!");
    }
}

let stakedAmount = 0;
let rewardsEarned = 0;
const rewardRate = 0.1; // Example: 10% APY

// Display staking section if STYX is available
document.addEventListener("DOMContentLoaded", () => {
    if (tokens.find((t) => t.name === "Styxora")) {
        document.getElementById("staking-section").style.display = "block";
    }

    document.getElementById("stake-form").addEventListener("submit", handleStake);
    document.getElementById("unstake-btn").addEventListener("click", handleUnstake);
});

// Handle staking
async function handleStake(event) {
    event.preventDefault();

    const stakeAmount = parseFloat(document.getElementById("stake-amount").value.trim());
    if (!stakeAmount || stakeAmount <= 0) {
        alert("Invalid staking amount.");
        return;
    }

    const styxToken = tokens.find((t) => t.name === "Styxora");
    const provider = getProvider(styxToken);
    const contract = new ethers.Contract(styxToken.bscAddressTestnet, tokenAbi, bnbWallet); // No need for .connect()

    try {
        const allowance = await contract.allowance(bnbWallet.address, bnbWallet.address);
        if (allowance.lt(ethers.utils.parseUnits(stakeAmount.toString(), styxToken.decimals))) {
            await contract.approve(bnbWallet.address, ethers.constants.MaxUint256);
        }

        const tx = await contract.transfer(bnbWallet.address, ethers.utils.parseUnits(stakeAmount.toString(), styxToken.decimals));
        await tx.wait();

        stakedAmount += stakeAmount;
        updateStakingInfo();

        alert("Staking successful!");
    } catch (error) {
        console.error("Error during staking:", error);
        alert("Staking failed!");
    }
}


// Handle unstaking
async function handleUnstake() {
    if (stakedAmount <= 0) {
        alert("No tokens to unstake.");
        return;
    }

    const styxToken = tokens.find((t) => t.name === "Styxora");
    const provider = getProvider(styxToken);
    const contract = new ethers.Contract(styxToken.bscAddressTestnet, tokenAbi, bnbWallet.connect(provider));

    try {
        const tx = await contract.transfer(bnbWallet.address, ethers.utils.parseUnits(stakedAmount.toString(), styxToken.decimals));
        await tx.wait();

        stakedAmount = 0;
        rewardsEarned = 0;
        updateStakingInfo();

        alert("Unstaking successful!");
    } catch (error) {
        console.error("Error during unstaking:", error);
        alert("Unstaking failed!");
    }
}

// Update staking info
function updateStakingInfo() {
    document.getElementById("staked-amount").textContent = stakedAmount.toFixed(2);
    document.getElementById("earned-rewards").textContent = rewardsEarned.toFixed(2);
}

// Calculate rewards periodically
setInterval(() => {
    if (stakedAmount > 0) {
        rewardsEarned += (stakedAmount * rewardRate) / (365 * 24 * 3600); // APY distributed per second
        updateStakingInfo();
    }
}, 1000); // Update every second
