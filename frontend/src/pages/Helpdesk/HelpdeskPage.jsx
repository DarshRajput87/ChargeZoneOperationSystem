import { useEffect, useState } from "react";
import { getHelpdeskUsers } from "../../services/helpdeskService";
import HelpdeskTable from "./HelpdeskTable";
import "./helpdesk.css";

export default function HelpdeskPage() {
    const [users, setUsers] = useState([]);

    const fetchData = async () => {
        const res = await getHelpdeskUsers();
        setUsers(res.data || []);
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="helpdesk-page">
            <h2>Ticket Center</h2>
            <HelpdeskTable users={users} setUsers={setUsers} />
        </div>
    );
}