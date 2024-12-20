const API_BASE = "IP:PORT:Host";
const PAGE_SIZE = 3; // Number of transactions per page
let currentPage = 0;
let currentTransactions = []; // For paginated results
let pollingInterval = null; // To manage the polling process
let activeWallet = null; // Track the currently active wallet

// Update active wallet status on the page
function updateActiveWalletStatus() {
    const statusElement = document.getElementById("active-wallet-status");
    const senderInput = document.getElementById("sender-address");

    if (activeWallet) {
        statusElement.textContent = `Active Wallet: ${activeWallet}`;
        senderInput.value = activeWallet; // Update sender input dynamically
    } else {
        statusElement.textContent = "No active wallet";
        senderInput.value = ""; // Clear sender input
    }
}


// Normalize address
function normalizeAddress(address) {
    if (!address.startsWith("styx")) {
        return `styx${address}`;
    }
    return address;
}

// Generate wallet
async function generateWallet() {
    try {
        const response = await fetch(`${API_BASE}/generate_wallet`);
        const wallet = await response.json();
        document.getElementById("generate-response").innerHTML =
            `<strong>Seed Phrase:</strong> ${wallet.seed_phrase}<br><strong>Public Address:</strong> ${wallet.public_address}`;
    } catch (error) {
        console.error("Error generating wallet:", error);
        document.getElementById("generate-response").textContent = "Error generating wallet.";
    }
}




// Restore wallet
async function restoreWallet() {
    const seedPhrase = document.getElementById("restore-seed").value;

    if (!seedPhrase) {
        document.getElementById("restore-response").textContent = "Error: Seed phrase is required.";
        return;
    }

    // Confirmation to ensure the seed phrase is saved
    const confirmSave = confirm(
        "Have you saved your seed phrase securely? You will need it to access your wallet in the future."
    );

    if (!confirmSave) {
        alert("Please save your seed phrase before restoring your wallet.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/restore_wallet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seed_phrase: seedPhrase })
        });
        const wallet = await response.json();
        activeWallet = wallet.public_address;
        updateActiveWalletStatus();

        // Hide the generate/restore sections after restoring wallet
        document.querySelector(".generate-section").style.display = "none";
        document.querySelector(".restore-section").style.display = "none";

        document.getElementById("restore-response").innerHTML =
            `<strong>Public Address:</strong> ${wallet.public_address}`;
    } catch (error) {
        console.error("Error restoring wallet:", error);
        document.getElementById("restore-response").textContent = "Error restoring wallet.";
    }
}



// Add transaction
// Add transaction
async function addTransaction() {
    const sender = activeWallet; // Use active wallet as sender
    const receiver = document.getElementById("receiver-address").value.trim();
    const amount = parseFloat(document.getElementById("amount").value);

    // Validate inputs
    if (!sender) {
        document.getElementById("transaction-response").textContent = "Error: No active wallet.";
        console.error("Add Transaction Error: No active wallet.");
        return;
    }

    if (!receiver || !/^styx[a-fA-F0-9]{40}$/.test(receiver)) {
        document.getElementById("transaction-response").textContent = "Error: Invalid receiver address.";
        console.error("Add Transaction Error: Invalid receiver address.");
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        document.getElementById("transaction-response").textContent = "Error: Invalid amount.";
        console.error("Add Transaction Error: Invalid amount.");
        return;
    }

    try {
        console.log("Sending transaction payload:", {
            sender_address: sender,
            receiver_address: receiver,
            amount
        });

        const response = await fetch(`${API_BASE}/add_transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_address: sender,
                receiver_address: receiver,
                amount
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Unknown error occurred.");
        }

        const result = await response.json();
        document.getElementById("transaction-response").textContent =
            result.message || "Transaction added successfully!";

        console.log("Transaction success:", result);

        // Refresh balances after the transaction
        await getBalances();
    } catch (error) {
        console.error("Error adding transaction:", error);
        document.getElementById("transaction-response").textContent =
            `Error: Unable to add transaction. ${error.message}`;
    }
}



// Fetch balances
let currentBalancesPage = 0; // Current page for balances
const BALANCES_PAGE_SIZE = 15; // Number of balances per page
let sortedBalances = []; // Sorted balances to paginate

async function getBalances() {
    try {
        const response = await fetch(`${API_BASE}/balances`);
        const balances = await response.json();

        // Sort balances from highest to lowest
        sortedBalances = Object.entries(balances)
            .filter(([address, balance]) => balance > 0)
            .sort(([, balanceA], [, balanceB]) => balanceB - balanceA); // Sort by balance

        // Reset to the first page and render the balances
        currentBalancesPage = 0;
        renderBalancesPage();
    } catch (error) {
        console.error("Error fetching balances:", error);
        document.getElementById("balances-response").textContent = "Error fetching balances.";
    }
}

function renderBalancesPage() {
    const start = currentBalancesPage * BALANCES_PAGE_SIZE;
    const end = Math.min(start + BALANCES_PAGE_SIZE, sortedBalances.length);
    const balancesToShow = sortedBalances.slice(start, end);

    const balancesContainer = document.getElementById("balances-response");
    if (balancesToShow.length === 0) {
        balancesContainer.innerHTML = "No balances to display.";
        return;
    }

    // Display balances as a list
    balancesContainer.innerHTML = `
        <ul>
            ${balancesToShow
                .map(([address, balance]) => `<li><strong>${address}</strong>: ${balance} Tokens</li>`)
                .join("")}
        </ul>
    `;

    // Update next and back button visibility
    document.getElementById("balances-prev-btn").style.display = currentBalancesPage > 0 ? "inline-block" : "none";
    document.getElementById("balances-next-btn").style.display = end < sortedBalances.length ? "inline-block" : "none";
}

function nextBalancesPage() {
    if ((currentBalancesPage + 1) * BALANCES_PAGE_SIZE < sortedBalances.length) {
        currentBalancesPage++;
        renderBalancesPage();
    }
}

function prevBalancesPage() {
    if (currentBalancesPage > 0) {
        currentBalancesPage--;
        renderBalancesPage();
    }
}


// Get reward pool
async function getRewardPool() {
    try {
        const response = await fetch(`${API_BASE}/get_reward_pool`);
        const result = await response.json();
        document.getElementById("reward-pool").innerHTML =
            `<strong>Reward Pool:</strong> ${result.reward_pool} Tokens`;
    } catch (error) {
        console.error("Error fetching reward pool:", error);
        document.getElementById("reward-pool").textContent = "Error fetching reward pool.";
    }
}

// Fetch token metadata
async function getTokenMetadata() {
    try {
        const response = await fetch(`${API_BASE}/token_metadata`);
        const metadata = await response.json();
        document.getElementById("token-name").textContent = `Name: ${metadata.name}`;
        document.getElementById("token-symbol").textContent = `Symbol: ${metadata.symbol}`;
    } catch (error) {
        console.error("Error fetching token metadata:", error);
        document.getElementById("token-name").textContent = "Name: Error loading.";
        document.getElementById("token-symbol").textContent = "Symbol: Error loading.";
    }
}

// Call on page load
getTokenMetadata();



async function slashValidator() {
    const adminAddress = normalizeAddress(document.getElementById("admin-address").value); // Admin public address
    const adminPrivateKey = document.getElementById("admin-private-key").value; // Admin private key
    const validator = normalizeAddress(document.getElementById("slash-validator").value); // Validator address
    const penalty = parseFloat(document.getElementById("slash-penalty").value); // Penalty amount

    try {
        // Generate a digital signature
        const message = `${adminAddress}|${validator}|${penalty}`;
        const signature = await generateSignature(adminPrivateKey, message);

        // Log the signature for debugging
        console.log("Generated Signature:", signature);

        // Send the request to the backend
        const response = await fetch(`${API_BASE}/slash_validator`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_address: adminAddress,
                validator,
                penalty,
                signature
            })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Unknown error occurred.");
        }

        document.getElementById("slash-response").textContent = result.message;
    } catch (error) {
        console.error("Error slashing validator:", error);
        document.getElementById("slash-response").textContent = "Error applying slashing.";
    }
}



async function searchTransactions(interval = 5000) {
    const query = document.getElementById("search-address").value;

    // Clear any existing polling
    if (pollingInterval) clearInterval(pollingInterval);

    try {
        let response;

        // Check if query is a transaction hash (64 characters long)
        if (query.length === 64) {
            response = await fetch(`${API_BASE}/get_transaction/${query}`);
            const transaction = await response.json();
            if (!response.ok) throw new Error(transaction.error || "Transaction not found.");

            // Display single transaction
            currentTransactions = [transaction];
            renderTransactions();

            // Poll for updates for this transaction hash
            pollingInterval = setInterval(async () => {
                try {
                    const pollResponse = await fetch(`${API_BASE}/get_transaction/${query}`);
                    const updatedTransaction = await pollResponse.json();
                    if (pollResponse.ok) {
                        currentTransactions = [updatedTransaction];
                        renderTransactions();
                    }
                } catch (pollError) {
                    console.error("Polling error for transaction:", pollError);
                }
            }, interval);

            return;
        }

        // Otherwise, assume it's a wallet address
        response = await fetch(`${API_BASE}/get_transactions/${query}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Transactions not found.");

        // Store transactions for pagination
        currentTransactions = result.transactions;
        currentPage = 0; // Reset to the first page
        renderTransactions();

        // Poll for updates for this wallet address
        pollingInterval = setInterval(async () => {
            try {
                const pollResponse = await fetch(`${API_BASE}/get_transactions/${query}`);
                const updatedResult = await pollResponse.json();
                if (pollResponse.ok) {
                    currentTransactions = updatedResult.transactions;
                    renderTransactions();
                }
            } catch (pollError) {
                console.error("Polling error for wallet address:", pollError);
            }
        }, interval);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        document.getElementById("transactions-container").innerHTML = `
            <p class="error">Error: ${error.message}</p>
        `;
    }
}

// Helper function to render transactions (Pagination logic stays the same)
function renderTransactions() {
    const container = document.getElementById("transactions-container");
    container.innerHTML = "";

    if (currentTransactions.length === 0) {
        container.innerHTML = "<p>No transactions to display.</p>";
        return;
    }

    // Reverse the transactions to show the latest first
    const sortedTransactions = [...currentTransactions].reverse();

    // Calculate the range of transactions for the current page
    const start = currentPage * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, sortedTransactions.length);
    const transactionsToShow = sortedTransactions.slice(start, end);

    // Render transactions
    transactionsToShow.forEach((tx) => {
        container.innerHTML += `
            <div class="transaction">
                <p><strong>Hash:</strong> ${tx.hash}</p>
                <p><strong>Sender:</strong> ${tx.data.sender}</p>
                <p><strong>Receiver:</strong> ${tx.data.receiver}</p>
                <p><strong>Amount:</strong> ${tx.data.amount}</p>
                <p><strong>Fee:</strong> ${tx.data.fee}</p>
                <p><strong>Timestamp:</strong> ${new Date(tx.data.timestamp * 1000).toLocaleString()}</p>
                <hr>
            </div>
        `;
    });

    // Show or hide pagination buttons
    document.getElementById("prev-btn").style.display = currentPage > 0 ? "block" : "none";
    document.getElementById("next-btn").style.display =
        end < sortedTransactions.length ? "block" : "none";
}


// Pagination handlers
function nextPage() {
    if ((currentPage + 1) * PAGE_SIZE < currentTransactions.length) {
        currentPage++;
        renderTransactions();
    }
}

function prevPage() {
    if (currentPage > 0) {
        currentPage--;
        renderTransactions();
    }
}


async function claimFaucet() {
    if (!activeWallet) {
        document.getElementById("faucet-response").textContent = "Error: No active wallet.";
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/faucet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_address: activeWallet })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unknown error occurred.");
        }

        document.getElementById("faucet-response").textContent = result.message;

        // Refresh balances after claiming faucet
        await getBalances();
    } catch (error) {
        console.error("Error claiming faucet:", error);
        document.getElementById("faucet-response").textContent = `Error: ${error.message}`;
    }
}


// Call the function on page load
getTokenMetadata();
