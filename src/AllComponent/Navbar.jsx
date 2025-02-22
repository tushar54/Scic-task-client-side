import { Link } from "react-router-dom";
import { useAuth } from "../Authentication/AuthProvider";


const Navbar = () => {
    const { user, logout } = useAuth()
    const Out = async () => {
        await logout()
            .then(() => {

            })
            .catch((error) => {
                console.log(error)
            })
    }
    console.log(user)
    return (
        <div>
            <div className="navbar  ">
                <div className="navbar-start">
                    <Link to={'/'} className=" btn text-xl">Add Task</Link>
                </div>
                <div className="navbar-end">
                    {user ? <> <Link to={'/task'} className="border-2 text-center text-lg px-4 py-1 mx-3 rounded-md font-bold">Task</Link><Link ><button onClick={Out} className="btn font-bold">Logout</button></Link> </> : <Link to={'/login'}><button className="btn font-bold">Login</button></Link>}
                </div>
            </div>
        </div>
    );
};

export default Navbar;