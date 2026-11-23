/**
 * ==============================================================================
 * QMOOSA PRODUCTION DAPP CLIENT BASELINE
 * Multi-Provider RPC Fallback, EIP-6963 Discovery, Pre-Flight Simulation & Cache
 * ==============================================================================
 */

export interface RpcEndpointConfig {
  url: string;
  weight?: number;
  timeoutMs?: number;
}

export interface DappClientConfig {
  expectedChainId: number;
  rpcUrls: string[];
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  maxJitterMs?: number;
  cacheTtlMs?: number;
}

export interface SimulationResult {
  success: boolean;
  returnData?: string;
  revertReason?: string;
  gasEstimated?: bigint;
}

export interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

/**
 * Universal Cache for Blockchain State keyed by (chainId, blockNumber, address)
 */
export class DappStateCache {
  private cache = new Map<string, { value: any; timestamp: number }>();
  private ttlMs: number;

  constructor(ttlMs: number = 15000) {
    this.ttlMs = ttlMs;
  }

  private makeKey(chainId: number, blockNumber: bigint | number, address: string, method: string, params: any): string {
    return `${chainId}:${blockNumber}:${address.toLowerCase()}:${method}:${JSON.stringify(params)}`;
  }

  get<T>(chainId: number, blockNumber: bigint | number, address: string, method: string, params: any): T | null {
    const key = this.makeKey(chainId, blockNumber, address, method, params);
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  set<T>(chainId: number, blockNumber: bigint | number, address: string, method: string, params: any, value: T): void {
    const key = this.makeKey(chainId, blockNumber, address, method, params);
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Production-Grade Fault-Tolerant dApp Client
 */
export class DappClient {
  private config: Required<DappClientConfig>;
  private activeRpcIndex = 0;
  private stateCache: DappStateCache;
  private discoveredWallets = new Map<string, EIP6963ProviderDetail>();

  constructor(config: DappClientConfig) {
    this.config = {
      expectedChainId: config.expectedChainId,
      rpcUrls: config.rpcUrls.length > 0 ? config.rpcUrls : ['https://rpc.sepolia.org'],
      maxRetries: config.maxRetries ?? 5,
      initialDelayMs: config.initialDelayMs ?? 500,
      backoffFactor: config.backoffFactor ?? 2,
      maxJitterMs: config.maxJitterMs ?? 250,
      cacheTtlMs: config.cacheTtlMs ?? 15000,
    };
    this.stateCache = new DappStateCache(this.config.cacheTtlMs);
    this.initEIP6963WalletDiscovery();
  }

  /**
   * Listen for EIP-6963 wallet announcements
   */
  private initEIP6963WalletDiscovery(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('eip6963:announceProvider', (event: any) => {
      const detail = event.detail as EIP6963ProviderDetail;
      if (detail && detail.info && detail.info.rdns) {
        this.discoveredWallets.set(detail.info.rdns, detail);
      }
    });

    window.dispatchEvent(new Event('eip6963:requestProvider'));
  }

  public getDiscoveredWallets(): EIP6963ProviderDetail[] {
    return Array.from(this.discoveredWallets.values());
  }

  /**
   * Exponential backoff with random jitter
   */
  private async waitWithBackoff(attempt: number): Promise<void> {
    const base = this.config.initialDelayMs * Math.pow(this.config.backoffFactor, attempt);
    const jitter = Math.floor(Math.random() * this.config.maxJitterMs);
    const delay = base + jitter;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Failover to next RPC provider in the multi-provider fallback list
   */
  private rotateRpcEndpoint(): string {
    this.activeRpcIndex = (this.activeRpcIndex + 1) % this.config.rpcUrls.length;
    return this.config.rpcUrls[this.activeRpcIndex];
  }

  /**
   * Raw JSON-RPC call with multi-provider failover, timeout, and jittered retries
   */
  public async rpcCall<T = any>(method: string, params: any[] = []): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      const currentUrl = this.config.rpcUrls[this.activeRpcIndex];

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(currentUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now() + attempt,
            method,
            params,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429 || response.status >= 500) {
          throw new Error(`HTTP_${response.status}_RPC_ERROR`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message || `RPC_ERROR_${data.error.code}`);
        }

        return data.result as T;
      } catch (err: any) {
        lastError = err;
        this.rotateRpcEndpoint();
        await this.waitWithBackoff(attempt);
      }
    }

    throw new Error(`RPC_EXHAUSTED_ALL_PROVIDERS: ${lastError?.message || 'Unknown network error'}`);
  }

  /**
   * Strict Chain-ID Invariant Validation
   */
  public async validateChainId(): Promise<boolean> {
    const hexChainId = await this.rpcCall<string>('eth_chainId');
    const liveChainId = parseInt(hexChainId, 16);
    if (liveChainId !== this.config.expectedChainId) {
      throw new Error(`CHAIN_ID_MISMATCH: Expected ${this.config.expectedChainId}, connected to ${liveChainId}`);
    }
    return true;
  }

  /**
   * Pre-flight eth_call Simulation with Custom Error Decoding
   */
  public async simulateTransaction(tx: {
    from: string;
    to: string;
    data?: string;
    value?: string;
  }): Promise<SimulationResult> {
    try {
      await this.validateChainId();
      const returnData = await this.rpcCall<string>('eth_call', [tx, 'latest']);
      
      let gasEstimated: bigint | undefined;
      try {
        const estHex = await this.rpcCall<string>('eth_estimateGas', [tx]);
        gasEstimated = BigInt(estHex);
      } catch {
        gasEstimated = 210000n;
      }

      return {
        success: true,
        returnData,
        gasEstimated,
      };
    } catch (err: any) {
      return {
        success: false,
        revertReason: this.decodeRevertReason(err.message || ''),
      };
    }
  }

  /**
   * Human-readable revert reason decoding (Panics, Error(string), Custom Errors)
   */
  public decodeRevertReason(errorStr: string): string {
    if (errorStr.includes('0x4e487b71')) {
      return 'Panic(uint256): Assertion failed, overflow, or division by zero';
    }
    if (errorStr.includes('0x08c379a0')) {
      return 'Error(string): Standard contract require/revert condition triggered';
    }
    if (errorStr.includes('Unauthorized') || errorStr.includes('0x82b42900')) {
      return 'CustomError: Caller is not authorized (AccessControl)';
    }
    if (errorStr.includes('ReentrancyGuard') || errorStr.includes('0x3ee5aeb5')) {
      return 'CustomError: Reentrant call detected';
    }
    return errorStr;
  }

  /**
   * Poll for transaction receipt with exponential backoff
   */
  public async waitForTransactionReceipt(
    txHash: string,
    confirmations: number = 1,
    timeoutMs: number = 60000
  ): Promise<any> {
    const startTime = Date.now();
    let pollCount = 0;

    while (Date.now() - startTime < timeoutMs) {
      const receipt = await this.rpcCall<any>('eth_getTransactionReceipt', [txHash]);
      if (receipt && receipt.blockNumber) {
        if (confirmations <= 1) return receipt;

        const currentBlockHex = await this.rpcCall<string>('eth_blockNumber');
        const currentBlock = BigInt(currentBlockHex);
        const receiptBlock = BigInt(receipt.blockNumber);

        if (currentBlock - receiptBlock + 1n >= BigInt(confirmations)) {
          return receipt;
        }
      }

      await this.waitWithBackoff(Math.min(pollCount++, 4));
    }

    throw new Error(`TRANSACTION_RECEIPT_TIMEOUT: Exceeded ${timeoutMs}ms waiting for ${txHash}`);
  }
}
