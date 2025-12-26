'use client';

import { useEffect, useState } from 'react';
import { useGlobalContext } from '@/utils/providers/globalContext';
import { getAccessToken, usePrivy } from '@privy-io/react-auth';
import { RiLoader5Fill, RiDeleteBin6Line, RiEditLine, RiAddLine } from 'react-icons/ri';
import toast from 'react-hot-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/UI/table';
import Heading from '@/components/UI/Heading';
import Input from '@/components/UI/Input';
import { Button } from '@/components/UI/button';

interface WhitelistEntry {
  _id: string;
  walletAddress: string;
  nickname?: string;
  addedBy?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const { user } = useGlobalContext();
  const { authenticated } = usePrivy();
  const [whitelists, setWhitelists] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WhitelistEntry | null>(null);
  const [newWallet, setNewWallet] = useState('');
  const [newNickname, setNewNickname] = useState('');

  // Check if user has admin access (FID 666038)
  const isAdmin = user?.socialId === "666038" || user?.socialId === "1129842";

  toast.success(`Logged in as ${user?.socialId}`);

  useEffect(() => {
    if (authenticated 
        && isAdmin
    ) {
      fetchWhitelists();
    }
  }, [authenticated, isAdmin]);

  const fetchWhitelists = async () => {
    try {
      setLoading(true);
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/whitelist/list', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch whitelists');
      }

      const data = await response.json();
      setWhitelists(data.whitelists);
    } catch (error) {
      console.error('Error fetching whitelists:', error);
      toast.error('Failed to load whitelist data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async () => {
    if (!newWallet) {
      toast.error('Wallet address is required');
      return;
    }

    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/whitelist/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          walletAddress: newWallet,
          nickname: newNickname || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to add wallet');
        return;
      }

      toast.success('Wallet added successfully');
      setNewWallet('');
      setNewNickname('');
      setShowAddModal(false);
      fetchWhitelists();
    } catch (error) {
      console.error('Error adding wallet:', error);
      toast.error('Failed to add wallet');
    }
  };

  const handleUpdateWallet = async () => {
    if (!editingEntry) return;

    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/whitelist/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          walletAddress: editingEntry.walletAddress,
          nickname: newNickname,
          status: editingEntry.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to update wallet');
        return;
      }

      toast.success('Wallet updated successfully');
      setEditingEntry(null);
      setNewNickname('');
      fetchWhitelists();
    } catch (error) {
      console.error('Error updating wallet:', error);
      toast.error('Failed to update wallet');
    }
  };

  const handleDeleteWallet = async (walletAddress: string) => {
    if (!confirm('Are you sure you want to remove this wallet from the whitelist?')) {
      return;
    }

    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/whitelist/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to remove wallet');
        return;
      }

      toast.success('Wallet removed successfully');
      fetchWhitelists();
    } catch (error) {
      console.error('Error removing wallet:', error);
      toast.error('Failed to remove wallet');
    }
  };

  const handleToggleStatus = async (entry: WhitelistEntry) => {
    const newStatus = entry.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/admin/whitelist/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          walletAddress: entry.walletAddress,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to update status');
        return;
      }

      toast.success(`Status changed to ${newStatus}`);
      fetchWhitelists();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heading size="md" gradient={false} className="text-white mb-4">
            Access Denied
          </Heading>
          <p className="text-white/70">Please login to access admin panel.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heading size="md" gradient={false} className="text-white mb-4">
            Unauthorized
          </Heading>
          <p className="text-white/70">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Heading size="lg" gradient className="mb-0">
            Whitelists
          </Heading>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <RiAddLine className="text-xl" />
            Add
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RiLoader5Fill className="animate-spin text-4xl text-purple-500" />
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-white/70">Wallet Address</TableHead>
                  <TableHead className="text-white/70">Nickname</TableHead>
                  <TableHead className="text-white/70">Status</TableHead>
                  <TableHead className="text-white/70">Added By</TableHead>
                  <TableHead className="text-white/70">Date Added</TableHead>
                  <TableHead className="text-white/70 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whitelists.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-white/50 py-8">
                      No whitelisted wallets found
                    </TableCell>
                  </TableRow>
                ) : (
                  whitelists.map((entry) => (
                    <TableRow key={entry._id} className="hover:bg-white/5">
                      <TableCell className="text-white font-mono text-sm">
                        {entry.walletAddress.slice(0, 6)}...{entry.walletAddress.slice(-4)}
                      </TableCell>
                      <TableCell className="text-white">
                        {entry.nickname || <span className="text-white/30 italic">No nickname</span>}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            entry.status === 'ACTIVE'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-white/70">
                        {entry.addedBy || <span className="text-white/30 italic">Unknown</span>}
                      </TableCell>
                      <TableCell className="text-white/70">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingEntry(entry);
                              setNewNickname(entry.nickname || '');
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Edit nickname"
                          >
                            <RiEditLine className="text-blue-400 text-lg" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(entry)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title={entry.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            <span className="text-sm font-semibold">
                              {entry.status === 'ACTIVE' ? '🔓' : '🔒'}
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteWallet(entry.walletAddress)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <RiDeleteBin6Line className="text-red-400 text-lg" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 text-white/50 text-sm">
          Total Whitelisted Wallets: {whitelists.length}
        </div>
      </div>

      {/* Add Wallet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Add Wallet to Whitelist</h3>
            <div className="space-y-4">
              <div>
                <Input
                  label="Wallet Address"
                  type="text"
                  value={newWallet}
                  onChange={(value) => setNewWallet(value)}
                  placeholder="0x..."
                  className="w-full"
                  required
                />
              </div>
              <div>
                <Input
                  label="Nickname (Optional)"
                  type="text"
                  value={newNickname}
                  onChange={(value) => setNewNickname(value)}
                  placeholder="e.g., Limi, Captain"
                  className="w-full"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewWallet('');
                    setNewNickname('');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddWallet}
                  className="flex-1 bg-linear-to-r from-purple-500 to-pink-500"
                >
                  Add Wallet
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Nickname Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Edit Nickname</h3>
            <div className="space-y-4">
              <div>
                <label className="text-white/70 text-sm mb-2 block">Wallet Address</label>
                <div className="text-white font-mono text-sm bg-white/5 p-3 rounded-lg">
                  {editingEntry.walletAddress}
                </div>
              </div>
              <div>
                <Input
                  label="Nickname"
                  type="text"
                  value={newNickname}
                  onChange={(value) => setNewNickname(value)}
                  placeholder="Enter nickname"
                  className="w-full"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => {
                    setEditingEntry(null);
                    setNewNickname('');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateWallet}
                  className="flex-1 bg-linear-to-r from-purple-500 to-pink-500"
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
