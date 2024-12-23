"use client";

import React, { useState } from "react";
import { useGetUsers } from "./use-get-users";
import { useUpdateCredits } from "./useChangeCredits"; // Import the hook
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type User = {
    image: string | null;
    username: string;
    password: string | null;
    id: string;
    isAdmin: boolean | null;
    credits: number | null;
};

type EditingCredits = {
    [key: string]: number | undefined;
};

const ListUser: React.FC = () => {
    const {
        data,
        status,
        fetchNextPage,
        isFetchingNextPage,
        hasNextPage,
    } = useGetUsers();

    const [editingCredits, setEditingCredits] = useState<EditingCredits>({});

    const handleCreditChange = (id: string, newCredits: number) => {
        setEditingCredits((prev) => ({ ...prev, [id]: newCredits }));
    };

    const { mutate: updateCredits, isPending: isUpdating } = useUpdateCredits(
    );

    const saveCredits = (id: string) => {
        const updatedCredits = editingCredits[id];
        if (updatedCredits !== undefined) {
            updateCredits(
                { id, credits: updatedCredits },
                {
                    onSuccess: () => {
                        console.log(`Credits updated for user ${id}`);
                        setEditingCredits((prev) => ({ ...prev, [id]: undefined }));
                    },
                }
            );
        }
    };

    if (status === "pending") {
        return <div>Loading users...</div>;
    }

    if (status === "error") {
        return <div>Failed to load users.</div>;
    }

    if (!data.pages.length || !data.pages[0].data.length) {
        return <div>No users found.</div>;
    }

    return (
        <div>
            <h3 className="font-semibold text-lg">User List</h3>
            <div>
                {data.pages.map((group, i) => (
                    <React.Fragment key={i}>
                        {group.data.map((user: User) => (
                            <div key={user.id} className="flex items-center justify-between p-2 border-b">
                                <div className="flex items-center gap-4">
                                    {user.image ? (
                                        <img
                                            src={user.image}
                                            alt={user.username}
                                            className="w-10 h-10 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                                    )}
                                    <div>
                                        <p>{user.username}</p>
                                        <p className="text-sm text-gray-500">
                                            {user.isAdmin ? "Admin" : "User"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={editingCredits[user.id] ?? user.credits ?? ""}
                                        onChange={(e) => handleCreditChange(user.id, Number(e.target.value))}
                                        className="w-20"
                                    />
                                    <Button
                                        onClick={() => saveCredits(user.id)}
                                        disabled={editingCredits[user.id] === undefined || isUpdating}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>
            {hasNextPage && (
                <div className="w-full flex items-center justify-center pt-4">
                    <Button
                        variant="ghost"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                    >
                        Load more
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ListUser;
