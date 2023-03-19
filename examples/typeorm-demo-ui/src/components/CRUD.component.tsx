import { useEffect, useState } from "react";
import axios from "axios";

const AXIOS_DEFAULT_BASE_URL = "http://localhost:3000";

type Movie = {
    id: number;
    title: string;
    genre: string;
    year: number;
}

const CRUDComponent = () => {

    axios.defaults.baseURL = AXIOS_DEFAULT_BASE_URL;

    const [data, setData] = useState<Movie[]>([]);
    const [selectedItem, setSelectedItem] = useState<Movie | null>(null);
    const [formData, setFormData] = useState({
        id: '',
        title: '',
        genre: '',
        year: '',
    });

    useEffect(() => {
        fetchAll();
    }, [data]);

    const fetchAll = async () => {
        const response = await axios.get('/movies');
        setData(response.data);
    }

    const fetchOne = async (id: number) => {
        const response = await axios.get(`/movie/${id}`);
        setSelectedItem(response.data);
    }

    const handleCreate = async (data: any) => {
        data.preventDefault();

        await axios.post('/movie/create', formData);
        setFormData({id: '', title: '', genre: '', year: ''});
        fetchAll();
    };

    const handleDelete = async (id: number) => {
        await axios.delete(`/movie/${id}`);
        fetchAll();
    }

    const handleChange = (event: any) => {
        setFormData({...formData, [event.target.name]: event.target.value});
    };

    return (
        <div style={{display: "flex", flexDirection: "column", maxWidth: "80%"}}>
            <form onSubmit={handleCreate}>
                <input type="text" name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Title"
                />
                <input type="text" name="genre"
                    value={formData.genre}
                    onChange={handleChange}
                    placeholder="Genre"
                />
                <input type="text" name="year"
                    value={formData.year}
                    onChange={handleChange}
                    placeholder="Year"
                />
                <button className="button" type="submit">Create</button>
            </form>
            <br />
            <br />
            <table>
                <thead>
                    <tr>
                        <th>Id</th>
                        <th>Title</th>
                        <th>Genre</th>
                        <th>Year</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item: any) => (
                        <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>{item.title}</td>
                            <td>{item.genre}</td>
                            <td>{item.year}</td>
                            <td>
                                <button className="button" id="button-red" onClick={() => handleDelete(item.id)}>Delete</button>
                                <button className="button" onClick={() => fetchOne(item.id)}>View</button>
                            </td>
                        </tr>
                    ))}
                </tbody>   
            </table>

            {selectedItem && (
                <div>
                    <h2>Selected Item</h2>
                    <p>Id: {selectedItem.id}</p>
                    <p>Title: {selectedItem.title}</p>
                    <p>Genre: {selectedItem.genre}</p>
                    <p>Year: {selectedItem.year}</p>
                </div>
            )}
        </div>
    )
}

export default CRUDComponent;