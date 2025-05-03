import { CipherSuite, TLSPacketContext } from '@reclaimprotocol/tls';
import { ClaimTunnelRequest_TranscriptMessage as TranscriptMessage } from '../proto/api';
import { CompleteTLSPacket, Logger, MessageRevealInfo, PrepareZKProofsBaseOpts, Transcript } from '../types';
export type PreparePacketsForRevealOpts = {
    cipherSuite: CipherSuite;
    logger: Logger;
    /**
     * Progress of Zk proof generation
     */
    onZkProgress?(blocksDone: number, totalBlocks: number): void;
} & PrepareZKProofsBaseOpts;
/**
 * Prepares the packets for reveal to the server
 * according to the specified reveal type
 */
export declare function preparePacketsForReveal(tlsTranscript: Transcript<CompleteTLSPacket>, reveals: Map<TLSPacketContext, MessageRevealInfo>, { onZkProgress, ...opts }: PreparePacketsForRevealOpts): Promise<TranscriptMessage[]>;
