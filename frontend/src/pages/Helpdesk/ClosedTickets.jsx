import { useEffect, useState } from "react";
import { getClosedHelpdeskUsers } from "../../services/helpdeskService";
import HelpdeskTable from "./HelpdeskTable";
import "./helpdesk.css";

export default function ClosedTickets() {
    const [users, setUsers] = useState([]);

    const fetchData = async () => {
        const res = await getClosedHelpdeskUsers();
        setUsers(res.data || []);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="helpdesk-page">
            <h2>Closed Tickets</h2>
            <HelpdeskTable users={users} setUsers={setUsers} isClosed={true} />
        </div>
    );
}
