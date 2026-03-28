import HelpdeskRow from "./HelpdeskRow";

export default function HelpdeskTable({ users, setUsers, isClosed }) {
    return (
        // overflow: visible wrapper so tag dropdowns aren't clipped
        <div className="table-wrapper">
            <table className="helpdesk-table">
                <colgroup>
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "25%" }} />
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "7%" }} />
                </colgroup>
                <thead>
                    <tr>
                        <th className="col-user">User</th>
                        <th className="col-mobile">Mobile</th>
                        <th className="col-attended">Attended By</th>
                        <th className="col-issue">Issue</th>
                        <th className="col-comment">Comment</th>
                        <th className="col-action">{!isClosed ? "Action" : ""}</th>
                    </tr>
                </thead>

                <tbody>
                    {users.map((user) => (
                        <HelpdeskRow
                            key={user._id}
                            user={user}
                            setUsers={setUsers}
                            isClosed={isClosed}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}