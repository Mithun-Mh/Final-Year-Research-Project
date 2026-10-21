
export interface RubberLotNFT {
    id: string;
    tokenId: string;
    owner: string;
    metadata: {
        grade: string;
        weight: string;
        location: string;
        moistureLevel: string;
        cleanliness: string;
        timestamp: string;
    };
    ipfsHash: string;
    history: Array<{
        event: string;
        timestamp: string;
        actor: string;
        details: string;
        txHash: string;
    }>;
}

export const BlockchainService = {
    // Mock data for existing lots
    getLots: async (): Promise<RubberLotNFT[]> => {
        return [
            {
                id: '1',
                tokenId: '0x7b...82a',
                owner: 'Kamal Perera',
                metadata: {
                    grade: 'RSS1',
                    weight: '2,500 kg',
                    location: 'Kalutara',
                    moistureLevel: 'Normal',
                    cleanliness: 'Clean',
                    timestamp: new Date().toISOString()
                },
                ipfsHash: 'QmXoyp...3n7',
                history: [
                    { event: 'Lot Registered', timestamp: '2026-01-15 08:30', actor: 'Farmer: Kamal', details: 'Added 2500kg RSS1', txHash: '0x12a...bc3' },
                    { event: 'NFT Passport Minted', timestamp: '2026-01-15 08:35', actor: 'Ethereum Network', details: 'Token ID: #1024', txHash: '0x45d...ef6' },
                    { event: 'Quality Certified', timestamp: '2026-01-15 10:00', actor: 'Admin: Silva', details: 'IPFS Document Uploaded', txHash: '0x78g...hi9' },
                    { event: 'Auction Started', timestamp: '2026-01-16 09:00', actor: 'Smart Contract', details: 'Reserve Price: 400 LKR', txHash: '0x01j...kl2' }
                ]
            }
        ];
    },

    mintLotNFT: async (lotData: any): Promise<string> => {
        console.log("Minting NFT for lot:", lotData);
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        return "0xNFT" + Math.random().toString(16).slice(2, 10);
    },

    uploadToIPFS: async (document: any): Promise<string> => {
        console.log("Uploading to IPFS:", document);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return "Qm" + Math.random().toString(16).slice(2, 40);
    },

    getLotHistory: async (lotId: string): Promise<RubberLotNFT['history']> => {
        const lots = await BlockchainService.getLots();
        const lot = lots.find(l => l.id === lotId);
        return lot ? lot.history : [];
    }
};
