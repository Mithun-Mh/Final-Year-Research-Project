import apiClient from '../../../core/api/apiClient';

export interface BiddingAuction {
    id: string;
    title: string;
    subtitle: string;
    grade: string;
    currentPrice: number;
    minIncrement: number;
    quantity: string;
    seller: string;
    highestBidder: string;
    totalBids: number;
    timeRemaining: string;
    endTime?: string;
    progress: number;
    status: string;
    isNftSecured: boolean;
    nftTokenId?: string;
    ipfsHash?: string;
    esgScore?: number;
    lotId?: string;
}

export const BiddingService = {
    getActiveAuctions: async (): Promise<BiddingAuction[]> => {
        try {
            const response = await apiClient.get<{ success: boolean, data: BiddingAuction[] }>('/Bidding/auctions');
            return response.data.data;
        } catch (error) {
            console.error('Error in getActiveAuctions:', error);
            throw error;
        }
    },
    getClosedAuctions: async (): Promise<BiddingAuction[]> => {
        try {
            const response = await apiClient.get<{ success: boolean, data: BiddingAuction[] }>('/Bidding/history');
            return response.data.data;
        } catch (error) {
            console.error('Error in getClosedAuctions:', error);
            throw error;
        }
    },
    getAuctionById: async (id: string): Promise<BiddingAuction> => {
        try {
            const response = await apiClient.get<{ success: boolean, data: BiddingAuction }>(`/Bidding/auctions/${id}`);
            return response.data.data;
        } catch (error) {
            console.error('Error in getAuctionById:', error);
            throw error;
        }
    },
    createAuction: async (data: {
        title: string;
        subtitle: string;
        grade: string;
        startingPrice: number;
        minIncrement: number;
        quantityKg: number;
        endTime: string;
        lotId?: string;
    }): Promise<BiddingAuction> => {
        try {
            const response = await apiClient.post<{ success: boolean, data: BiddingAuction }>('/Bidding/auctions', data);
            return response.data.data;
        } catch (error) {
            console.error('Error in createAuction:', error);
            throw error;
        }
    },
    submitBid: async (auctionId: string, amount: number): Promise<any> => {
        try {
            const response = await apiClient.post(`/Bidding/auctions/${auctionId}/bid`, { amount });
            return response.data;
        } catch (error) {
            console.error('Error in submitBid:', error);
            throw error;
        }
    }
};
