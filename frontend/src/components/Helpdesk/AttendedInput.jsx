import { useState } from "react";
import { updateAttendedBy } from "../../services/helpdeskService";

export default function AttendedInput({ userId, value, onUpdated }) {
    const [editing, setEditing] = useState(false);
    const [input, setInput] = useState(value || "");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!input.trim()) return;

        setLoading(true);
        await updateAttendedBy(userId, input);
        setLoading(false);

        setEditing(false);
        onUpdated(input);
    };

    const handleCancel = () => {
        setInput(value || "");
        setEditing(false);
    };

    return (
        <div className="attended-input">
            {editing ? (
                <>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        autoFocus
                    />
                    <button onClick={handleSave}>
                        {loading ? "..." : "✔"}
                    </button>
                    <button onClick={handleCancel}>✖</button>
                </>
            ) : (
                <>
                    <span>{value || "-"}</span>
                    <button onClick={() => setEditing(true)}>✏️</button>
                </>
            )}
        </div>
    );
}