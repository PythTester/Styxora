import time
from hashlib import sha256
from wallet_manager import WalletManager
import json
import random


class Block:
    def __init__(self, index, timestamp, data, previous_hash):
        self.index = index
        self.timestamp = timestamp
        self.data = data  # Transactions
        self.previous_hash = previous_hash
        self.hash = self.calculate_hash()

    def calculate_hash(self):
        block_string = f"{self.index}{self.timestamp}{self.data}{self.previous_hash}"
        return sha256(block_string.encode()).hexdigest()


class Blockchain:
    def __init__(self, total_supply, name="Styxora", symbol="STYX", wallet_file="admin_wallet.json", state_file="blockchain_state.json"):
        self.faucet_amount = 100  # Amount to dispense per claim
        self.faucet_cooldown = 24 * 3600  # Cooldown period in seconds (24 hours)
        self.faucet_claims = {}  # Track last claim time for each address
        self.name = name  # Token name
        self.symbol = symbol  # Token symbol
        self.wallet_manager = WalletManager()
        self.wallet_file = wallet_file
        self.state_file = state_file
        self.active_wallets = {}  # Track active wallets
        self.total_blocks_validated = 0  # Track the number of blocks validated

        # Load admin wallet
        try:
            with open(self.wallet_file, "r") as f:
                admin_wallet = json.load(f)
                self.admin_seed_phrase = admin_wallet["seed_phrase"]
                self.admin_public_address = self.normalize_address(admin_wallet["public_address"])
                print("Admin wallet restored from file.")
        except FileNotFoundError:
            admin_wallet = self.wallet_manager.generate_wallet()
            self.admin_seed_phrase = admin_wallet["seed_phrase"]
            self.admin_public_address = self.normalize_address(admin_wallet["public_address"])
            with open(self.wallet_file, "w") as f:
                json.dump(admin_wallet, f)
                print("New admin wallet created and saved to file.")

        # Load blockchain state
        try:
            with open(self.state_file, "r") as f:
                state = json.load(f)
                self.balances = {self.normalize_address(k): v for k, v in state["balances"].items()}
                self.transactions = {
                    k: {**v, "sender": self.normalize_address(v["sender"]), "receiver": self.normalize_address(v["receiver"])}
                    for k, v in state["transactions"].items()
                }
                self.reward_pool = state.get("reward_pool", 0)
                self.total_blocks_validated = state.get("total_blocks_validated", 0)
                print("Blockchain state restored from file.")
        except FileNotFoundError:
            self.balances = {self.admin_public_address: total_supply}
            self.transactions = {}
            self.reward_pool = 0
            self.total_blocks_validated = 0

        self.total_supply = total_supply
        self.chain = [self.create_genesis_block()]

    def normalize_address(self, address):
        """Ensure all addresses are in the 'styx' prefixed format."""
        if not address.startswith("styx"):
            return f"styx{address}"
        return address

    def create_genesis_block(self):
        return Block(0, time.time(), "Genesis Block", "0")

    def claim_faucet(self, public_address):
        try:
            public_address = self.normalize_address(public_address)

            print(f"Processing faucet claim for: {public_address}")

            # Check if the address has already claimed
            now = time.time()
            last_claim = self.faucet_claims.get(public_address, 0)

            if now - last_claim < self.faucet_cooldown:
                remaining_time = self.faucet_cooldown - (now - last_claim)
                print(f"Faucet cooldown active for {public_address}. Remaining time: {remaining_time} seconds.")
                return f"Faucet can be claimed in {int(remaining_time / 3600)} hours.", 403

            # Ensure admin wallet has enough tokens for the faucet claim
            if self.balances.get(self.admin_public_address, 0) < self.faucet_amount:
                print(f"Admin wallet does not have enough tokens for faucet claim.")
                return "Faucet temporarily unavailable due to insufficient funds.", 503

            # Deduct tokens from admin wallet
            self.balances[self.admin_public_address] -= self.faucet_amount
            if self.balances[self.admin_public_address] <= 0:
                del self.balances[self.admin_public_address]

            # Add tokens to user's wallet
            self.balances[public_address] = self.balances.get(public_address, 0) + self.faucet_amount
            self.faucet_claims[public_address] = now

            # Create a transaction between admin and user
            transaction_data = {
                "sender": self.admin_public_address,
                "receiver": public_address,
                "amount": self.faucet_amount,
                "fee": 0,
                "timestamp": now
            }
            transaction_hash = sha256(json.dumps(transaction_data, sort_keys=True).encode()).hexdigest()
            self.transactions[transaction_hash] = transaction_data

            print(f"Faucet transaction created. Hash: {transaction_hash}")

            self.save_state()
            return f"{self.faucet_amount} STYX tokens claimed successfully!"

        except Exception as e:
            print(f"Error in claim_faucet: {e}")
            return f"An error occurred: {e}", 500

    def save_state(self):
        state = {
            "balances": self.balances,
            "transactions": self.transactions,
            "reward_pool": self.reward_pool,
            "name": self.name,
            "symbol": self.symbol,
            "total_blocks_validated": self.total_blocks_validated,
            "faucet_claims": self.faucet_claims,
        }
        with open(self.state_file, "w") as f:
            json.dump(state, f)
            print("Blockchain state saved to file.")


    def restore_wallet(self, seed_phrase):
        """Restore a wallet and activate it for the session."""
        wallet = self.wallet_manager.restore_wallet(seed_phrase)
        public_address = wallet["public_address"]
        private_key = wallet["private_key"]

        # Activate the wallet for the session
        self.active_wallets[public_address] = private_key  # Use a dictionary
        print(f"Wallet {public_address} activated.")
        return wallet

    def add_transaction(self, sender_address, receiver_address, amount):
        try:
            sender_address = self.normalize_address(sender_address)
            receiver_address = self.normalize_address(receiver_address)

            if sender_address not in self.active_wallets:
                return "Sender wallet is not active. Please restore your wallet before sending transactions.", 403

            private_key = self.active_wallets.get(sender_address)  # Fetch the private key
            if not private_key:
                return "Unauthorized: Wallet is not properly restored.", 403

            if self.balances.get(sender_address, 0) < amount:
                return "Insufficient balance.", 400

            # Calculate fee and transfer amount
            fee = amount * 0.01
            net_amount = amount - fee

            # Deduct from sender
            self.balances[sender_address] -= amount
            if self.balances[sender_address] <= 0:
                del self.balances[sender_address]

            # Add to receiver
            self.balances[receiver_address] = self.balances.get(receiver_address, 0) + net_amount

            # Add fee to reward pool
            self.reward_pool += fee

            # Create transaction hash
            transaction_data = {
                "sender": sender_address,
                "receiver": receiver_address,
                "amount": net_amount,
                "fee": fee,
                "timestamp": time.time()
            }
            transaction_hash = sha256(json.dumps(transaction_data, sort_keys=True).encode()).hexdigest()
            self.transactions[transaction_hash] = transaction_data

            # Save state
            self.save_state()
            return f"Transaction successful! Hash: {transaction_hash}"

        except Exception as e:
            print(f"Error in add_transaction: {e}")
            return "Transaction failed due to an internal error.", 500

    def validate_block(self):
        """Validate a block automatically, reward the validator, and distribute rewards periodically."""
        try:
            validator = self.select_validator()
            if not validator:
                return "No validators available."

            # Reward the validator
            reward = self.reward_pool / 10  # Example reward per block
            self.balances[validator] += reward
            self.reward_pool -= reward
            self.total_blocks_validated += 1

            # Check if rewards need to be distributed
            if self.total_blocks_validated % 10 == 0:
                self.distribute_rewards()

            # Save state
            self.save_state()
            return f"Block validated by {validator}. Reward: {reward} tokens."
        except Exception as e:
            print(f"Error in validate_block: {e}")
            return "Block validation failed."

    def distribute_rewards(self):
        """Distribute rewards from the reward pool to all holders proportionally."""
        print("Distributing rewards to holders...")
        if self.reward_pool <= 0:
            print("No rewards available in the reward pool.")
            return

        total_balance = sum(balance for balance in self.balances.values() if balance > 0)
        if total_balance == 0:
            print("No holders available for reward distribution.")
            return

        # Calculate distribution
        distribution_amount = self.reward_pool * 0.1  # 10% of the reward pool
        for address, balance in self.balances.items():
            if balance > 0:
                reward = (balance / total_balance) * distribution_amount
                self.balances[address] += reward

        self.reward_pool -= distribution_amount
        print(f"Rewards distributed. Remaining reward pool: {self.reward_pool}")

