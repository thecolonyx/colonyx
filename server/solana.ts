import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
} from "@solana/web3.js";
import { decrypt, base58Decode } from "./crypto";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUPITER_QUOTE_URL = "https://quote-api.jup.ag/v6/quote";
const JUPITER_SWAP_URL = "https://quote-api.jup.ag/v6/swap";

function getConnection(): Connection {
  const heliusKey = process.env.HELIUS_API_KEY;
  if (!heliusKey) {
    throw new Error("HELIUS_API_KEY not configured");
  }
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, "confirmed");
}

function getKeypairFromEncrypted(encryptedPrivateKey: string): Keypair {
  const base58Key = decrypt(encryptedPrivateKey);
  const secretKey = base58Decode(base58Key);
  return Keypair.fromSecretKey(secretKey);
}

export async function transferSol(
  encryptedPrivateKey: string,
  destinationAddress: string,
  amountSol: number
): Promise<{ txHash: string; fee: number }> {
  const connection = getConnection();
  const keypair = getKeypairFromEncrypted(encryptedPrivateKey);
  const destination = new PublicKey(destinationAddress);

  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const balance = await connection.getBalance(keypair.publicKey);
  const estimatedFee = 5000;
  if (balance < lamports + estimatedFee) {
    throw new Error(
      `Insufficient balance: have ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL, need ${amountSol} SOL + fee`
    );
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: destination,
      lamports,
    })
  );

  const txHash = await sendAndConfirmTransaction(connection, transaction, [keypair], {
    commitment: "confirmed",
    maxRetries: 3,
  });

  return { txHash, fee: estimatedFee / LAMPORTS_PER_SOL };
}

export async function jupiterSwap(
  encryptedPrivateKey: string,
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 100
): Promise<{ txHash: string; inputAmount: string; outputAmount: string }> {
  const connection = getConnection();
  const keypair = getKeypairFromEncrypted(encryptedPrivateKey);

  const quoteParams = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
    onlyDirectRoutes: "false",
    asLegacyTransaction: "false",
  });

  const quoteResponse = await fetch(`${JUPITER_QUOTE_URL}?${quoteParams}`);
  if (!quoteResponse.ok) {
    const errText = await quoteResponse.text();
    throw new Error(`Jupiter quote failed: ${errText}`);
  }

  const quoteData = await quoteResponse.json();
  if (!quoteData || !quoteData.outAmount) {
    throw new Error("No swap route found for this token pair");
  }

  const swapResponse = await fetch(JUPITER_SWAP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quoteData,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });

  if (!swapResponse.ok) {
    const errText = await swapResponse.text();
    throw new Error(`Jupiter swap instruction failed: ${errText}`);
  }

  const swapData = await swapResponse.json();
  const swapTransactionBuf = Buffer.from(swapData.swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  transaction.sign([keypair]);

  const txHash = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(txHash, "confirmed");

  return {
    txHash,
    inputAmount: quoteData.inAmount,
    outputAmount: quoteData.outAmount,
  };
}

export async function executeBuyToken(
  encryptedPrivateKey: string,
  tokenMint: string,
  amountSol: number,
  slippageBps: number = 100
): Promise<{ txHash: string; solSpent: string; tokensReceived: string }> {
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const result = await jupiterSwap(
    encryptedPrivateKey,
    SOL_MINT,
    tokenMint,
    lamports,
    slippageBps
  );

  return {
    txHash: result.txHash,
    solSpent: (parseInt(result.inputAmount) / LAMPORTS_PER_SOL).toString(),
    tokensReceived: result.outputAmount,
  };
}

export async function executeSellToken(
  encryptedPrivateKey: string,
  tokenMint: string,
  amountTokens: string,
  tokenDecimals: number = 9,
  slippageBps: number = 100
): Promise<{ txHash: string; tokensSold: string; solReceived: string }> {
  const rawAmount = Math.round(parseFloat(amountTokens) * Math.pow(10, tokenDecimals));

  const result = await jupiterSwap(
    encryptedPrivateKey,
    tokenMint,
    SOL_MINT,
    rawAmount,
    slippageBps
  );

  return {
    txHash: result.txHash,
    tokensSold: result.inputAmount,
    solReceived: (parseInt(result.outputAmount) / LAMPORTS_PER_SOL).toString(),
  };
}

export async function getTokenDecimals(tokenMint: string): Promise<number> {
  try {
    const connection = getConnection();
    const mintPubkey = new PublicKey(tokenMint);
    const info = await connection.getParsedAccountInfo(mintPubkey);
    if (info.value && "parsed" in (info.value.data as any)) {
      return (info.value.data as any).parsed.info.decimals;
    }
    return 9;
  } catch {
    return 9;
  }
}

export async function getWalletSolBalance(publicAddress: string): Promise<number> {
  const connection = getConnection();
  const balance = await connection.getBalance(new PublicKey(publicAddress));
  return balance / LAMPORTS_PER_SOL;
}
