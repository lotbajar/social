import ListLoadMore from '@/components/app/list-load-more';
import SearchBar from '@/components/app/search-bar';
import SearchSearchResults from '@/components/app/search-results';
import { EntryListUpdateContext } from '@/contexts/entry-list-update-context';
import { usePaginatedData } from '@/hooks/app/use-paginated-data';
import AppLayout from '@/layouts/kit/app-layout';
import { AppContentLayout } from '@/layouts/kit/app/app-content-layout';
import type { BreadcrumbItem, Post, SearchResults, SearchType, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PageProps {
    type: SearchType; // Tipo de búsqueda (publicación o usuario).
    query: string; // Término de búsqueda.
    results: SearchResults; // Resultados de la búsqueda.
    [key: string]: any;
}

/**
 * Vista que muestra los resultados de una búsqueda global,
 * ya sea por publicaciones o por usuarios.
 */
export default function SearchIndex() {
    // Función para traducir los textos de la interfaz.
    const { t } = useTranslation();

    // Captura las propiedades de la página proporcionadas por Inertia.
    const { props } = usePage<PageProps>();

    // Estado local para el tipo de búsqueda y el término consultado.
    const [type, setType] = useState<SearchType>(props.type);
    const [query, setQuery] = useState(props.query);

    // Referencia para indicar cuándo deben reiniciarse los datos paginados
    // tras ejecutar una nueva búsqueda.
    const shouldReset = useRef(false);

    // Usa el hook de paginación para gestionar los resultados de búsqueda.
    const {
        items: results, // Lista actual de resultados visibles.
        nextCursor, // Cursor para solicitar la siguiente página de resultados.
        processing, // Indica si se está cargando más contenido.
        loadMore, // Función para cargar más resultados.
        applyItemChange, // Función para sincronizar cambios en publicaciones.
        resetProps, // Función para restablecer los resultados a su estado inicial.
    } = usePaginatedData<Post | User>({
        initialItems: props.results.data, // Resultados iniciales cargados desde el servidor.
        initialCursor: props.results.meta.next_cursor, // Cursor inicial de paginación.
        propKey: 'results', // Propiedad de la respuesta de Inertia que contiene los datos.
    });

    // Migas de pan de la vista actual.
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: t('search'),
            href: route('search.index'),
        },
    ];

    // Ejecuta una nueva búsqueda actualizando el tipo y la consulta.
    const onSubmit = (newType: SearchType, newQuery: string) => {
        setType(newType);
        setQuery(newQuery);

        // Marca que los resultados deben reiniciarse tras recibir la respuesta.
        shouldReset.current = true;

        router.get(
            route('search.index'),
            { type: newType, query: newQuery },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['results'],
            },
        );
    };

    // Reinicia la paginación cuando cambian los resultados tras una nueva búsqueda.
    useEffect(() => {
        if (shouldReset.current) {
            resetProps();
            shouldReset.current = false;
        }
    }, [props.results.data, props.results.meta.next_cursor]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {/* Título del documento */}
            <Head title="Buscar" />

            <AppContentLayout>
                {/* Barra de búsqueda */}
                <SearchBar type={type} query={query} onSubmit={onSubmit} />

                {/* Contexto para sincronizar cambios en los resultados */}
                <EntryListUpdateContext.Provider value={applyItemChange}>
                    {/* Listado de resultados según el tipo de búsqueda */}
                    <SearchSearchResults results={type === 'post' ? (results as Post[]) : (results as User[])} />
                </EntryListUpdateContext.Provider>

                {/* Botón para cargar más resultados */}
                <ListLoadMore type="post" cursor={nextCursor} isProcessing={processing} onClick={loadMore} />
            </AppContentLayout>
        </AppLayout>
    );
}
