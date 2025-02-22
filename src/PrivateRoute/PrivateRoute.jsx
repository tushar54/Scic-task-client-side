import { Navigate } from "react-router-dom";
import { useAuth } from "../Authentication/AuthProvider";

// eslint-disable-next-line react/prop-types
const PrivateRoute = ({children}) => {
    
const {user,loading}=useAuth()
if(loading)
{
    return <div className="text-center">data is fetching</div>
}
if(user){
    return children 
}
    return (
        <Navigate to={'/login'}></Navigate>
    );
};

export default PrivateRoute;