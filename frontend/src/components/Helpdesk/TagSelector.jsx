import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { updateTags } from "../../services/helpdeskService";

const DEFAULT_TAGS = [
    "Charging Issue",
    "Payment Issue",
    "App Bug",
    "Slow Charging",
    "Connector Problem",
];

export default function TagSelector({ userId, selected, onUpdated }) {
    const [query, setQuery] = useState("");
    const [allTags, setAllTags] = useState(DEFAULT_TAGS);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef(null);
    const addBtnRef = useRef(null);

    const filtered = allTags.filter(
        (tag) =>
            tag.toLowerCase().includes(query.toLowerCase()) &&
            !selected.includes(tag)
    );

    const canAdd =
        query.trim().length > 0 &&
        !allTags.some((t) => t.toLowerCase() === query.trim().toLowerCase());

    // Recalculate dropdown position whenever it opens or chips change
    useEffect(() => {
        if (dropdownOpen && addBtnRef.current) {
            const rect = addBtnRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 220),
            });
        }
    }, [dropdownOpen, selected]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (
                addBtnRef.current &&
                !addBtnRef.current.contains(e.target) &&
                !document.getElementById("tag-dropdown-portal")?.contains(e.target)
            ) {
                setDropdownOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const saveUpdated = async (updated) => {
        await updateTags(userId, updated);
        onUpdated(updated);
    };

    const handleSelect = async (tag) => {
        if (selected.includes(tag)) return;
        await saveUpdated([...selected, tag]);
        setQuery("");
        inputRef.current?.focus();
    };

    const handleAddNew = async () => {
        const newTag = query.trim();
        if (!newTag) return;
        if (!allTags.includes(newTag)) setAllTags((prev) => [...prev, newTag]);
        await handleSelect(newTag);
    };

    const handleRemove = async (tag) => {
        await saveUpdated(selected.filter((t) => t !== tag));
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            if (filtered.length > 0) handleSelect(filtered[0]);
            else if (canAdd) handleAddNew();
        }
        if (e.key === "Escape") { setDropdownOpen(false); setQuery(""); }
    };

    const toggleDropdown = () => {
        setDropdownOpen((prev) => !prev);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    // Portal dropdown — renders at <body> level, completely outside table DOM
    const dropdownEl = dropdownOpen ? (
        ReactDOM.createPortal(
            <div
                id="tag-dropdown-portal"
                className="tag-dropdown"
                style={{
                    position: "absolute",
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    zIndex: 9999,
                }}
            >
                {/* Search input inside dropdown */}
                <div className="tag-dropdown-search">
                    <input
                        ref={inputRef}
                        className="tag-dropdown-search-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search or add tag…"
                        autoFocus
                    />
                </div>

                {filtered.map((tag) => (
                    <div
                        key={tag}
                        className="tag-dropdown-item"
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(tag); }}
                    >
                        {tag}
                    </div>
                ))}
                {canAdd && (
                    <div
                        className="tag-dropdown-item tag-dropdown-add"
                        onMouseDown={(e) => { e.preventDefault(); handleAddNew(); }}
                    >
                        <span className="tag-add-icon">+</span>
                        Add &ldquo;{query.trim()}&rdquo;
                    </div>
                )}
                {filtered.length === 0 && !canAdd && query.length > 0 && (
                    <div className="tag-dropdown-empty">No tags found</div>
                )}
            </div>,
            document.body
        )
    ) : null;

    return (
        <div className="tag-selector-wrapper">
            {/* Tag chips */}
            {selected.map((tag) => (
                <span key={tag} className="tag-chip">
                    {tag}
                    <button
                        className="tag-chip-remove"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemove(tag);
                        }}
                    >
                        ×
                    </button>
                </span>
            ))}

            {/* Add button */}
            <button
                ref={addBtnRef}
                className="tag-add-btn"
                onClick={toggleDropdown}
                title="Add issue tag"
            >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="6" y1="1" x2="6" y2="11" />
                    <line x1="1" y1="6" x2="11" y2="6" />
                </svg>
                Add
            </button>

            {dropdownEl}
        </div>
    );
}