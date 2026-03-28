import React, { useState } from "react";
import { Link } from "react-router-dom";
import AttendedInput from "../../components/Helpdesk/AttendedInput";
import TagSelector from "../../components/Helpdesk/TagSelector";
import { closeTicket, updateComment } from "../../services/helpdeskService";
import HistoryModal from "../../components/Helpdesk/HistoryModal";

export default function HelpdeskRow({ user, setUsers, isClosed }) {
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [commentEnabled, setCommentEnabled] = useState(!!user.comment);
    const [commentText, setCommentText] = useState(user.comment || "");

    const handleClose = async () => {
        await closeTicket(user._id);

        // instant UI update
        setUsers(prev => prev.filter(u => u._id !== user._id));
    };

    const updateTagsLocal = (tags) => {
        setUsers(prev =>
            prev.map(u =>
                u._id === user._id ? { ...u, tags } : u
            )
        );
    };

    const updateAttendedLocal = (attendedBy) => {
        setUsers(prev =>
            prev.map(u =>
                u._id === user._id ? { ...u, attendedBy } : u
            )
        );
    };

    const handleCommentToggle = async () => {
        if (commentEnabled) {
            // Turning off — clear comment
            setCommentEnabled(false);
            setCommentText("");
            await updateComment(user._id, "");
            setUsers(prev =>
                prev.map(u =>
                    u._id === user._id ? { ...u, comment: "" } : u
                )
            );
        } else {
            setCommentEnabled(true);
        }
    };

    const handleCommentBlur = async () => {
        if (commentText !== (user.comment || "")) {
            await updateComment(user._id, commentText);
            setUsers(prev =>
                prev.map(u =>
                    u._id === user._id ? { ...u, comment: commentText } : u
                )
            );
        }
    };

    return (
        <React.Fragment>
            <tr>
                <td className="col-user">
                    <div className="user-info-cell">
                        <span className="user-name">{user.userName || "-"}</span>
                        {user.history && user.history.length > 0 && (
                            <button
                                onClick={() => setHistoryModalOpen(true)}
                                className="history-btn"
                                title="View History"
                            >
                                History
                            </button>
                        )}
                    </div>
                </td>
                <td className="col-mobile">
                    <Link
                        to={`/customer-management?search=${user.mobile}`}
                        className="cm-phone-link"
                        title="View in Customer Management"
                    >
                        {user.mobile}
                    </Link>
                </td>

                <td className="col-attended">
                    {isClosed ? (
                        <span className="attended-readonly">{user.attendedBy || "-"}</span>
                    ) : (
                        <AttendedInput
                            userId={user._id}
                            value={user.attendedBy}
                            onUpdated={updateAttendedLocal}
                        />
                    )}
                </td>

                <td className="col-issue tags-col">
                    {isClosed ? (
                        <div className="tag-selector-wrapper">
                            {user.tags && user.tags.map(tag => (
                                <span key={tag} className="tag-chip" style={{ paddingRight: "10px" }}>{tag}</span>
                            ))}
                        </div>
                    ) : (
                        <TagSelector
                            userId={user._id}
                            selected={user.tags || []}
                            onUpdated={updateTagsLocal}
                        />
                    )}
                </td>

                {/* Comment Column */}
                <td className="col-comment comment-col">
                    {isClosed ? (
                        <span className="comment-readonly">
                            {user.comment || "-"}
                        </span>
                    ) : (
                        <div className="comment-section">
                            <label className="comment-toggle">
                                <input
                                    type="checkbox"
                                    checked={commentEnabled}
                                    onChange={handleCommentToggle}
                                />
                                <span className="comment-toggle-slider"></span>
                                <span className="comment-toggle-label">
                                    {commentEnabled ? "Comment" : "Add Comment"}
                                </span>
                            </label>
                            {commentEnabled && (
                                <textarea
                                    className="comment-textarea"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onBlur={handleCommentBlur}
                                    placeholder="Write a comment…"
                                    rows={2}
                                />
                            )}
                        </div>
                    )}
                </td>

                <td className="col-action action-col">
                    {!isClosed && (
                        <button className="close-btn" onClick={handleClose}>
                            Close
                        </button>
                    )}
                </td>
            </tr>

            {historyModalOpen && (
                <HistoryModal
                    isOpen={historyModalOpen}
                    onClose={() => setHistoryModalOpen(false)}
                    userName={user.userName || user.mobile}
                    history={user.history}
                />
            )}
        </React.Fragment>
    );
}