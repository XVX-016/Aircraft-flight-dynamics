interface Props {
    title: string;
    description: string;
}

export function CapabilityCard({ title, description }: Props) {
    return (
        <div className="border border-neutral-800 rounded-md p-5 hover:border-neutral-600 transition">
            <h3 className="font-medium mb-2">{title}</h3>
            <p className="text-sm text-neutral-400">{description}</p>
        </div>
    );
}
